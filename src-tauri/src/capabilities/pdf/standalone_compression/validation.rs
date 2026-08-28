use std::collections::HashSet;

use anyhow::{Context, Result};
use lopdf::{Document, Object, ObjectId};

#[derive(Debug, Clone, PartialEq)]
pub(super) struct DocumentGeometry(Vec<PageGeometry>);

#[derive(Debug, Clone, PartialEq)]
struct PageGeometry {
    media_box: [f64; 4],
    rotation: i64,
}

pub(super) fn capture_geometry(document: &Document) -> Result<DocumentGeometry> {
    let pages = document
        .get_pages()
        .into_values()
        .map(|page_id| page_geometry(document, page_id))
        .collect::<Result<Vec<_>>>()?;
    Ok(DocumentGeometry(pages))
}

pub(super) fn validate_serialized_pdf(
    bytes: &[u8],
    expected: &DocumentGeometry,
    max_decompressed_stream_bytes: usize,
) -> Result<()> {
    let document = Document::load_mem_with_options(
        bytes,
        lopdf::LoadOptions::with_max_decompressed_size(max_decompressed_stream_bytes),
    )
    .context("serialized PDF cannot be reopened")?;
    let actual = capture_geometry(&document).context("serialized PDF page geometry is invalid")?;
    anyhow::ensure!(
        actual == *expected,
        "serialized PDF changed page count, dimensions, or rotations"
    );
    Ok(())
}

fn page_geometry(document: &Document, page_id: ObjectId) -> Result<PageGeometry> {
    let media_box = inherited_value(document, page_id, b"MediaBox")?
        .context("PDF page has no inherited MediaBox")?;
    let media_box = document.dereference(media_box)?.1.as_array()?;
    anyhow::ensure!(
        media_box.len() == 4,
        "PDF page MediaBox must have four values"
    );
    let media_box = [
        number(&media_box[0])?,
        number(&media_box[1])?,
        number(&media_box[2])?,
        number(&media_box[3])?,
    ];
    let rotation = inherited_value(document, page_id, b"Rotate")?
        .map(|value| document.dereference(value)?.1.as_i64())
        .transpose()?
        .unwrap_or(0);
    Ok(PageGeometry {
        media_box,
        rotation,
    })
}

fn inherited_value<'a>(
    document: &'a Document,
    mut object_id: ObjectId,
    key: &[u8],
) -> Result<Option<&'a Object>> {
    let mut visited = HashSet::new();
    loop {
        anyhow::ensure!(visited.insert(object_id), "PDF page tree contains a cycle");
        let dictionary = document.get_dictionary(object_id)?;
        if let Ok(value) = dictionary.get(key) {
            return Ok(Some(value));
        }
        let Ok(parent) = dictionary.get(b"Parent") else {
            return Ok(None);
        };
        object_id = parent.as_reference()?;
    }
}

fn number(object: &Object) -> Result<f64> {
    match object {
        Object::Integer(value) => Ok(*value as f64),
        Object::Real(value) => Ok(f64::from(*value)),
        _ => anyhow::bail!("PDF page box contains a non-numeric value"),
    }
}
