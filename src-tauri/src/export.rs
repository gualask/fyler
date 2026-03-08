use std::collections::HashMap;

use anyhow::Context;
use lopdf::Document as PdfDoc;

use crate::models::{FileEdits, MergeRequest};
use crate::pdf::{image_to_pdf_doc, prepare_pdf_page_doc, quarter_turns_to_degrees};
use crate::source_registry::SourceRegistry;

fn quarter_turns_for_pdf_page(edits: Option<&FileEdits>, page_num: u32) -> anyhow::Result<u8> {
    let turns = edits
        .and_then(|value| value.page_rotations.get(&page_num.to_string()).copied())
        .unwrap_or(0);
    let _ = quarter_turns_to_degrees(turns)?;
    Ok(turns)
}

fn quarter_turns_for_image(edits: Option<&FileEdits>) -> anyhow::Result<u8> {
    let turns = edits.and_then(|value| value.image_rotation).unwrap_or(0);
    let _ = quarter_turns_to_degrees(turns)?;
    Ok(turns)
}

pub fn build_documents(
    req: &MergeRequest,
    registry: &SourceRegistry,
    image_fit: &str,
) -> anyhow::Result<Vec<PdfDoc>> {
    let mut pdf_cache: HashMap<String, PdfDoc> = HashMap::new();
    let mut docs = Vec::with_capacity(req.pages.len());

    for page in &req.pages {
        let source = registry
            .get(&page.file_id)
            .with_context(|| format!("Sorgente '{}' non trovato", page.file_id))?;
        let edits = req.edits.get(&page.file_id);

        if source.kind == "image" {
            docs.push(image_to_pdf_doc(
                &source.original_path,
                image_fit,
                quarter_turns_for_image(edits)?,
            )?);
            continue;
        }

        let source_doc = if let Some(doc) = pdf_cache.get(&page.file_id) {
            doc.clone()
        } else {
            let doc = PdfDoc::load(&source.original_path)
                .with_context(|| format!("Errore apertura PDF '{}'", source.name))?;
            pdf_cache.insert(page.file_id.clone(), doc.clone());
            doc
        };

        docs.push(prepare_pdf_page_doc(
            source_doc,
            page.page_num,
            quarter_turns_for_pdf_page(edits, page.page_num)?,
        )?);
    }

    Ok(docs)
}
