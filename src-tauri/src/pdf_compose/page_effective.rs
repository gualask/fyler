use anyhow::{Context, Result};
use lopdf::{Dictionary, Document as PdfDoc, Object, ObjectId};

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
    let mut visited = std::collections::HashSet::new();

    loop {
        if !visited.insert(current) {
            anyhow::bail!("page tree loop detected at {:?}", current);
        }
        let dict = doc.get_dictionary(current)?;
        if let Ok(value) = dict.get(key) {
            return Ok(Some(resolve_indirect(doc, value)?));
        }

        match dict.get(b"Parent") {
            Ok(Object::Reference(parent)) => current = *parent,
            _ => return Ok(None),
        }
    }
}

fn effective_resources(doc: &PdfDoc, page_id: ObjectId) -> Result<Dictionary> {
    let mut chain: Vec<ObjectId> = Vec::new();
    let mut current = page_id;
    let mut visited = std::collections::HashSet::new();

    loop {
        if !visited.insert(current) {
            anyhow::bail!("page tree loop detected at {:?}", current);
        }
        chain.push(current);
        let dict = doc.get_dictionary(current)?;
        match dict.get(b"Parent") {
            Ok(Object::Reference(parent)) => current = *parent,
            _ => break,
        }
    }

    chain.reverse();

    let mut merged = Dictionary::new();
    for node_id in chain {
        let dict = doc.get_dictionary(node_id)?;
        let resources_obj = match dict.get(b"Resources") {
            Ok(value) => value,
            Err(_) => continue,
        };

        let resolved = resolve_dictionary(doc, resources_obj)
            .with_context(|| format!("resolve Resources for {:?}", node_id))?;

        let mut normalized = Dictionary::new();
        for (key, value) in resolved.iter() {
            if let Ok(dict) = resolve_dictionary(doc, value) {
                normalized.set(key.clone(), Object::Dictionary(dict));
            } else {
                normalized.set(key.clone(), value.clone());
            }
        }

        merge_resources(&mut merged, &normalized);
    }

    Ok(merged)
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

    let media_box = inherited_value(doc, page_id, b"MediaBox")?.ok_or_else(|| {
        anyhow::Error::new(UserFacingError::with_meta(
            "page_missing_mediabox",
            serde_json::json!({ "name": source_name }),
        ))
    })?;
    out.set("MediaBox", media_box);

    for key in ["CropBox", "BleedBox", "TrimBox", "ArtBox"] {
        if let Some(value) = inherited_value(doc, page_id, key.as_bytes())? {
            out.set(key, value);
        }
    }

    let resources = effective_resources(doc, page_id)?;
    out.set("Resources", Object::Dictionary(resources));

    let base_rotate = inherited_value(doc, page_id, b"Rotate")?
        .map(|value| match value {
            Object::Integer(n) => Ok(n),
            _ => anyhow::bail!("expected integer Rotate"),
        })
        .transpose()?
        .unwrap_or(0);
    let mut total = (base_rotate + extra_degrees) % 360;
    if total < 0 {
        total += 360;
    }

    if total == 0 {
        out.remove(b"Rotate");
    } else {
        out.set("Rotate", Object::Integer(total));
    }

    out.set("Type", Object::Name(b"Page".to_vec()));
    Ok(out)
}
