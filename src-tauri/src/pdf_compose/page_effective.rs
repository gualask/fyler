use anyhow::{Context, Result};
use lopdf::{Dictionary, Document as PdfDoc, Object, ObjectId};
use std::collections::HashSet;

use crate::error::UserFacingError;

use super::resources::merge_resources;

fn resolve_indirect(doc: &PdfDoc, value: &Object) -> Result<Object> {
    Ok(match value {
        Object::Reference(id) => doc
            .get_object(*id)
            .with_context(|| format!("missing indirect object {:?}", id))?
            .clone(),
        other => other.clone(),
    })
}

fn resolve_dictionary(doc: &PdfDoc, value: &Object) -> Result<Dictionary> {
    match value {
        Object::Dictionary(dict) => Ok(dict.clone()),
        Object::Reference(id) => Ok(doc.get_dictionary(*id)?.clone()),
        _ => anyhow::bail!("expected dictionary"),
    }
}

fn inherited_value(doc: &PdfDoc, start: ObjectId, key: &[u8]) -> Result<Option<Object>> {
    let mut current = start;
    let mut visited = HashSet::new();

    loop {
        if !visited.insert(current) {
            anyhow::bail!("page tree loop detected at {:?}", current);
        }
        let dict = doc.get_dictionary(current)?;
        if let Ok(value) = dict.get(key) {
            return Ok(Some(resolve_indirect(doc, value)?));
        }

        match parent_reference(dict) {
            Some(parent) => current = parent,
            None => return Ok(None),
        }
    }
}

fn parent_reference(dict: &Dictionary) -> Option<ObjectId> {
    match dict.get(b"Parent") {
        Ok(Object::Reference(parent)) => Some(*parent),
        _ => None,
    }
}

fn page_tree_chain(doc: &PdfDoc, start: ObjectId) -> Result<Vec<ObjectId>> {
    let mut chain: Vec<ObjectId> = Vec::new();
    let mut current = start;
    let mut visited = HashSet::new();

    loop {
        if !visited.insert(current) {
            anyhow::bail!("page tree loop detected at {:?}", current);
        }
        chain.push(current);
        let dict = doc.get_dictionary(current)?;
        match parent_reference(dict) {
            Some(parent) => current = parent,
            None => break,
        }
    }

    Ok(chain)
}

fn normalize_resource_dictionary(doc: &PdfDoc, resources: &Dictionary) -> Dictionary {
    let mut normalized = Dictionary::new();
    for (key, value) in resources.iter() {
        if let Ok(dict) = resolve_dictionary(doc, value) {
            normalized.set(key.clone(), Object::Dictionary(dict));
        } else {
            normalized.set(key.clone(), value.clone());
        }
    }
    normalized
}

fn merge_resources_from_node(
    doc: &PdfDoc,
    node_id: ObjectId,
    merged: &mut Dictionary,
) -> Result<()> {
    let dict = doc.get_dictionary(node_id)?;
    let resources_obj = match dict.get(b"Resources") {
        Ok(value) => value,
        Err(_) => return Ok(()),
    };

    let resolved = resolve_dictionary(doc, resources_obj)
        .with_context(|| format!("resolve Resources for {:?}", node_id))?;
    let normalized = normalize_resource_dictionary(doc, &resolved);
    merge_resources(merged, &normalized);

    Ok(())
}

fn effective_resources(doc: &PdfDoc, page_id: ObjectId) -> Result<Dictionary> {
    let mut chain = page_tree_chain(doc, page_id)?;
    chain.reverse();

    let mut merged = Dictionary::new();
    for node_id in chain {
        merge_resources_from_node(doc, node_id, &mut merged)?;
    }

    Ok(merged)
}

fn required_media_box(doc: &PdfDoc, page_id: ObjectId, source_name: &str) -> Result<Object> {
    inherited_value(doc, page_id, b"MediaBox")?.ok_or_else(|| {
        anyhow::Error::new(UserFacingError::with_meta(
            "page_missing_mediabox",
            serde_json::json!({ "name": source_name }),
        ))
    })
}

fn apply_inherited_page_boxes(
    doc: &PdfDoc,
    page_id: ObjectId,
    source_name: &str,
    out: &mut Dictionary,
) -> Result<()> {
    out.set("MediaBox", required_media_box(doc, page_id, source_name)?);

    for key in ["CropBox", "BleedBox", "TrimBox", "ArtBox"] {
        if let Some(value) = inherited_value(doc, page_id, key.as_bytes())? {
            out.set(key, value);
        }
    }

    Ok(())
}

fn inherited_integer(
    doc: &PdfDoc,
    page_id: ObjectId,
    key: &[u8],
    label: &str,
) -> Result<Option<i64>> {
    inherited_value(doc, page_id, key)?
        .map(|value| match value {
            Object::Integer(n) => Ok(n),
            _ => anyhow::bail!("expected integer {label}"),
        })
        .transpose()
}

fn normalized_rotation_degrees(base_degrees: i64, extra_degrees: i64) -> i64 {
    let mut total = (base_degrees + extra_degrees) % 360;
    if total < 0 {
        total += 360;
    }
    total
}

fn effective_rotation_degrees(doc: &PdfDoc, page_id: ObjectId, extra_degrees: i64) -> Result<i64> {
    let base_rotate = inherited_integer(doc, page_id, b"Rotate", "Rotate")?.unwrap_or(0);
    Ok(normalized_rotation_degrees(base_rotate, extra_degrees))
}

fn apply_rotation(out: &mut Dictionary, rotation_degrees: i64) {
    if rotation_degrees == 0 {
        out.remove(b"Rotate");
    } else {
        out.set("Rotate", Object::Integer(rotation_degrees));
    }
}

/// Builds a self-contained page dictionary for composition.
///
/// This resolves inherited page tree values (MediaBox/resources/rotation) so the resulting page can
/// be inserted into a new document without depending on the original page tree structure.
pub fn effective_page_dictionary(
    doc: &PdfDoc,
    page_id: ObjectId,
    source_name: &str,
    extra_quarter_turns: u8,
) -> Result<Dictionary> {
    let extra_degrees = crate::pdf::quarter_turns_to_degrees(extra_quarter_turns)? as i64;

    let mut out = doc.get_dictionary(page_id)?.clone();

    out.remove(b"Parent");

    apply_inherited_page_boxes(doc, page_id, source_name, &mut out)?;
    let resources = effective_resources(doc, page_id)?;
    out.set("Resources", Object::Dictionary(resources));

    let rotation = effective_rotation_degrees(doc, page_id, extra_degrees)?;
    apply_rotation(&mut out, rotation);

    out.set("Type", Object::Name(b"Page".to_vec()));
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::{dictionary, Document as PdfDoc};

    fn source_with_page_tree(base_rotate: i64) -> (PdfDoc, ObjectId) {
        let mut doc = PdfDoc::with_version("1.5");
        let pages_id: ObjectId = (1, 0);
        let page_id: ObjectId = (2, 0);
        let parent_resources_id: ObjectId = (3, 0);

        doc.objects.insert(
            parent_resources_id,
            Object::Dictionary(dictionary! {
                "XObject" => dictionary! {
                    "ParentImage" => Object::Name(b"parent".to_vec()),
                },
                "ColorSpace" => dictionary! {
                    "ParentSpace" => Object::Name(b"DeviceRGB".to_vec()),
                },
            }),
        );
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Count" => 1,
                "Kids" => vec![Object::Reference(page_id)],
                "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
                "CropBox" => vec![10.into(), 20.into(), 600.into(), 780.into()],
                "Rotate" => base_rotate,
                "Resources" => parent_resources_id,
            }),
        );
        doc.objects.insert(
            page_id,
            Object::Dictionary(dictionary! {
                "Type" => "Page",
                "Parent" => pages_id,
                "Resources" => dictionary! {
                    "XObject" => dictionary! {
                        "PageImage" => Object::Name(b"page".to_vec()),
                    },
                },
            }),
        );

        (doc, page_id)
    }

    #[test]
    fn effective_page_dictionary_merges_inherited_resources_and_boxes() -> Result<()> {
        let (doc, page_id) = source_with_page_tree(90);

        let page = effective_page_dictionary(&doc, page_id, "fixture.pdf", 1)?;

        assert!(page.get(b"Parent").is_err());
        assert_eq!(page.get(b"Rotate")?.as_i64()?, 180);
        assert_eq!(page.get(b"MediaBox")?.as_array()?.len(), 4);
        assert_eq!(page.get(b"CropBox")?.as_array()?.len(), 4);

        let resources = page.get(b"Resources")?.as_dict()?;
        let xobject = resources.get(b"XObject")?.as_dict()?;
        assert!(xobject.get(b"ParentImage").is_ok());
        assert!(xobject.get(b"PageImage").is_ok());
        assert!(resources
            .get(b"ColorSpace")?
            .as_dict()?
            .get(b"ParentSpace")
            .is_ok());

        Ok(())
    }

    #[test]
    fn effective_page_dictionary_removes_zero_rotation() -> Result<()> {
        let (doc, page_id) = source_with_page_tree(270);

        let page = effective_page_dictionary(&doc, page_id, "fixture.pdf", 1)?;

        assert!(page.get(b"Rotate").is_err());
        Ok(())
    }
}
