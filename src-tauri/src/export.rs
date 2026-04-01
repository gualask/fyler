use lopdf::Document as PdfDoc;
use tauri::{AppHandle, Emitter};

use crate::error::UserFacingError;
use crate::models::{FileEdits, MergeRequest, MergeResult};
use crate::optimize;
use crate::pdf::quarter_turns_to_degrees;
use crate::pdf_compose::PdfComposer;
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
        .and_then(|value| value.page_rotations.get(&page_num).copied())
        .unwrap_or(0);
    let _ = quarter_turns_to_degrees(turns)?;
    Ok(turns)
}

fn quarter_turns_for_image(edits: Option<&FileEdits>) -> anyhow::Result<u8> {
    let turns = edits.map(|value| value.image_rotation).unwrap_or(0);
    let _ = quarter_turns_to_degrees(turns)?;
    Ok(turns)
}

struct CachedPdfSource {
    doc: PdfDoc,
    memo: std::collections::HashMap<lopdf::ObjectId, lopdf::ObjectId>,
}

fn build_last_use_index(
    pages: &[crate::models::ExportPage],
) -> std::collections::HashMap<String, usize> {
    let mut map = std::collections::HashMap::new();
    for (index, page) in pages.iter().enumerate() {
        map.insert(page.file_id.clone(), index);
    }
    map
}

fn resolve_source(
    registry: &SourceRegistry,
    file_id: &str,
) -> anyhow::Result<crate::source_registry::RegisteredSource> {
    registry.get(file_id).ok_or_else(|| {
        anyhow::Error::new(UserFacingError::with_meta(
            "source_not_found",
            serde_json::json!({ "fileId": file_id }),
        ))
    })
}

fn load_cached_pdf_source<'a>(
    cache: &'a mut std::collections::HashMap<String, CachedPdfSource>,
    file_id: String,
    path: &str,
    name: &str,
) -> anyhow::Result<&'a mut CachedPdfSource> {
    use std::collections::hash_map::Entry;

    Ok(match cache.entry(file_id) {
        Entry::Occupied(existing) => existing.into_mut(),
        Entry::Vacant(vacant) => {
            let doc = PdfDoc::load(path).map_err(|_| {
                anyhow::Error::new(UserFacingError::with_meta(
                    "open_pdf_failed",
                    serde_json::json!({ "name": name }),
                ))
            })?;
            vacant.insert(CachedPdfSource {
                doc,
                memo: std::collections::HashMap::new(),
            })
        }
    })
}

fn compose_document(
    app: &AppHandle,
    registry: &SourceRegistry,
    req: &MergeRequest,
    image_fit: &str,
) -> anyhow::Result<PdfDoc> {
    emit_progress(app, "preparing-documents", 0);
    let mut pdf_cache: std::collections::HashMap<String, CachedPdfSource> =
        std::collections::HashMap::new();
    let last_use_index_by_file_id = build_last_use_index(&req.pages);
    let mut composer = PdfComposer::new();

    emit_progress(app, "merging-pages", 5);
    for (index, page) in req.pages.iter().enumerate() {
        let should_evict_pdf_cache =
            last_use_index_by_file_id.get(&page.file_id).copied() == Some(index);
        let source = resolve_source(registry, &page.file_id)?;
        let edits = req.edits.get(&page.file_id);

        if source.kind == "image" {
            composer.push_image_page(
                &source.original_path,
                image_fit,
                quarter_turns_for_image(edits)?,
                req.optimize.as_ref(),
            )?;
        } else {
            {
                let entry = load_cached_pdf_source(
                    &mut pdf_cache,
                    page.file_id.clone(),
                    &source.original_path,
                    &source.name,
                )?;
                composer.push_pdf_page(
                    &entry.doc,
                    &mut entry.memo,
                    &source.name,
                    page.page_num,
                    quarter_turns_for_pdf_page(edits, page.page_num)?,
                )?;
            }

            if should_evict_pdf_cache {
                pdf_cache.remove(&page.file_id);
            }
        }

        if index % 10 == 0 {
            let progress =
                ((index as f64 / req.pages.len().max(1) as f64) * 55.0).round() as u8 + 5;
            emit_progress(app, "merging-pages", progress.min(60));
        }
    }

    composer.finish()
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

    if req.pages.is_empty() {
        return Err(anyhow::Error::new(UserFacingError::new(
            "no_documents_to_merge",
        )));
    }

    let mut merged = compose_document(app, registry, &req, image_fit)?;

    let mut optimization_failed_count = 0;
    if let Some(options) = &req.optimize {
        if optimize::has_optimization_work(options) {
            emit_progress(app, "optimizing-images", 80);
            optimization_failed_count =
                optimize::optimize_images(&mut merged, options)?.failed_non_fatal;
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
