use std::collections::HashMap;

use anyhow::{bail, Context};
use lopdf::Document as PdfDoc;
use tauri::{AppHandle, Emitter};

use crate::models::{FileEdits, MergeRequest, MergeResult};
use crate::optimize;
use crate::pdf::{
    image_to_pdf_doc, prepare_pdf_page_doc, prepare_pdf_subset_doc, quarter_turns_to_degrees,
};
use crate::source_registry::SourceRegistry;

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    step: &'static str,
    progress: u8,
}

fn emit_progress(app: &AppHandle, step: &'static str, progress: u8) {
    let _ = app.emit("merge-progress", ProgressPayload { step, progress });
}

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

fn is_simple_pdf_run(page_numbers: &[u32]) -> bool {
    page_numbers.windows(2).all(|window| window[0] < window[1])
}

fn split_monotonic_page_runs(page_numbers: &[u32]) -> Vec<&[u32]> {
    if page_numbers.is_empty() {
        return Vec::new();
    }

    let mut runs = Vec::new();
    let mut run_start = 0;

    for index in 1..page_numbers.len() {
        if page_numbers[index - 1] >= page_numbers[index] {
            runs.push(&page_numbers[run_start..index]);
            run_start = index;
        }
    }

    runs.push(&page_numbers[run_start..]);
    runs
}

pub fn build_documents(
    req: &MergeRequest,
    registry: &SourceRegistry,
    image_fit: &str,
) -> anyhow::Result<Vec<PdfDoc>> {
    let mut pdf_cache: HashMap<String, PdfDoc> = HashMap::new();
    let mut docs = Vec::with_capacity(req.pages.len());
    let mut index = 0;

    while index < req.pages.len() {
        let page = &req.pages[index];
        let source = registry
            .get(&page.file_id)
            .with_context(|| format!("Source '{}' not found", page.file_id))?;
        let edits = req.edits.get(&page.file_id);

        if source.kind == "image" {
            docs.push(image_to_pdf_doc(
                &source.original_path,
                image_fit,
                quarter_turns_for_image(edits)?,
                req.optimize.as_ref(),
            )?);
            index += 1;
            continue;
        }

        let source_doc = if let Some(doc) = pdf_cache.get(&page.file_id) {
            doc.clone()
        } else {
            let doc = PdfDoc::load(&source.original_path)
                .with_context(|| format!("Failed to open PDF '{}'", source.name))?;
            pdf_cache.insert(page.file_id.clone(), doc.clone());
            doc
        };

        let mut run_end = index + 1;
        let mut run_pages = vec![page.page_num];
        while run_end < req.pages.len() && req.pages[run_end].file_id == page.file_id {
            run_pages.push(req.pages[run_end].page_num);
            run_end += 1;
        }

        if is_simple_pdf_run(&run_pages) {
            let subset_pages = run_pages
                .iter()
                .copied()
                .map(|page_num| Ok((page_num, quarter_turns_for_pdf_page(edits, page_num)?)))
                .collect::<anyhow::Result<Vec<_>>>()?;
            docs.push(prepare_pdf_subset_doc(source_doc, &subset_pages)?);
        } else {
            for chunk in split_monotonic_page_runs(&run_pages) {
                if chunk.len() == 1 {
                    let page_num = chunk[0];
                    docs.push(prepare_pdf_page_doc(
                        source_doc.clone(),
                        page_num,
                        quarter_turns_for_pdf_page(edits, page_num)?,
                    )?);
                    continue;
                }

                let subset_pages = chunk
                    .iter()
                    .copied()
                    .map(|page_num| Ok((page_num, quarter_turns_for_pdf_page(edits, page_num)?)))
                    .collect::<anyhow::Result<Vec<_>>>()?;
                docs.push(prepare_pdf_subset_doc(source_doc.clone(), &subset_pages)?);
            }
        }

        index = run_end;
    }

    Ok(docs)
}

#[cfg(test)]
mod tests {
    use super::split_monotonic_page_runs;

    #[test]
    fn split_monotonic_page_runs_keeps_increasing_chunks_together() {
        let runs = split_monotonic_page_runs(&[1, 2, 4, 3, 5, 5, 7, 1]);
        assert_eq!(runs, vec![&[1, 2, 4][..], &[3, 5][..], &[5, 7][..], &[1][..]]);
    }

    #[test]
    fn split_monotonic_page_runs_handles_empty_input() {
        assert!(split_monotonic_page_runs(&[]).is_empty());
    }
}

pub fn export_pdf(
    app: &AppHandle,
    registry: &SourceRegistry,
    req: MergeRequest,
) -> anyhow::Result<MergeResult> {
    #[cfg(debug_assertions)]
    if std::env::var_os("FYLER_DEBUG_EXPORT").is_some() {
        eprintln!(
            "[fyler] export request: total_items={} optimize={}",
            req.pages.len(),
            req.optimize.is_some()
        );
        for (index, page) in req.pages.iter().enumerate() {
            eprintln!(
                "[fyler]   item[{index}] file_id={} page_num={}",
                page.file_id, page.page_num
            );
        }
    }

    let image_fit = req
        .optimize
        .as_ref()
        .and_then(|options| options.image_fit.as_deref())
        .unwrap_or("fit");

    emit_progress(app, "preparing-documents", 0);
    let docs = build_documents(&req, registry, image_fit)?;
    if docs.is_empty() {
        bail!("No documents to merge");
    }

    emit_progress(app, "merging-pages", 60);
    let mut docs = docs;
    let mut merged = if docs.len() == 1 {
        docs.pop().expect("single prepared document")
    } else {
        crate::pdf::merge_pdf_documents(docs)?
    };

    let mut optimization_failed_count = 0;
    if let Some(options) = &req.optimize {
        if optimize::has_optimization_work(options) {
            emit_progress(app, "optimizing-images", 80);
            optimization_failed_count = optimize::optimize_images(&mut merged, options)?.failed_non_fatal;
        }
    }

    emit_progress(app, "saving", 90);
    if let Some(parent) = std::path::Path::new(&req.output_path).parent() {
        std::fs::create_dir_all(parent)?;
    }
    optimize::cleanup_document(&mut merged);
    let mut file = std::fs::File::create(&req.output_path)?;
    optimize::save_document(&mut merged, &mut file)?;
    Ok(MergeResult {
        optimization_failed_count,
    })
}
