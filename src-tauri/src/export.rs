use lopdf::Document as PdfDoc;
use tauri::{AppHandle, Emitter};

use crate::error::UserFacingError;
use crate::models::{ExportItem, FileEdits, MergeRequest, MergeResult, MergeWarning};
use crate::optimize;
use crate::pdf::validate_quarter_turns;
use crate::pdf_compose::PdfComposer;
use crate::source_registry::SourceRegistry;
use crate::vo::{DocKind, ImageFit};

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
    validate_quarter_turns(turns)?;
    Ok(turns)
}

fn quarter_turns_for_image(edits: Option<&FileEdits>) -> anyhow::Result<u8> {
    let turns = edits.map(|value| value.image_rotation).unwrap_or(0);
    validate_quarter_turns(turns)?;
    Ok(turns)
}

/// In-memory cache for a loaded PDF source during a single export.
///
/// `memo` maps source object IDs to destination object IDs so repeated references are copied once.
struct CachedPdfSource {
    doc: PdfDoc,
    memo: std::collections::HashMap<lopdf::ObjectId, lopdf::ObjectId>,
}

fn build_last_use_index(pages: &[ExportItem]) -> std::collections::HashMap<&str, usize> {
    let mut map = std::collections::HashMap::new();
    for (index, page) in pages.iter().enumerate() {
        let file_id: &str = match page {
            ExportItem::Pdf { file_id, .. } => file_id.as_str(),
            ExportItem::Image { file_id } => file_id.as_str(),
        };
        map.insert(file_id, index);
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
    file_id: &str,
    path: &str,
    name: &str,
) -> anyhow::Result<&'a mut CachedPdfSource> {
    if !cache.contains_key(file_id) {
        let doc = PdfDoc::load(path).map_err(|_| {
            anyhow::Error::new(UserFacingError::with_meta(
                "open_pdf_failed",
                serde_json::json!({ "name": name }),
            ))
        })?;
        cache.insert(
            file_id.to_owned(),
            CachedPdfSource {
                doc,
                memo: std::collections::HashMap::new(),
            },
        );
    }
    Ok(cache.get_mut(file_id).expect("just inserted"))
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
    let mut source_cache: std::collections::HashMap<
        &str,
        crate::source_registry::RegisteredSource,
    > = std::collections::HashMap::new();
    let mut composer = PdfComposer::new();

    emit_progress(app, "merging-pages", 5);
    for (index, page) in req.pages.iter().enumerate() {
        let (file_id, pdf_page_num) = match page {
            ExportItem::Pdf { file_id, page_num } => (file_id.as_str(), Some(*page_num)),
            ExportItem::Image { file_id } => (file_id.as_str(), None),
        };

        // Evict per-source cached PDFs once we've appended their last referenced page.
        // This keeps memory usage bounded even if users export very large compositions.
        let should_evict_pdf_cache = last_use_index_by_file_id.get(file_id).copied() == Some(index);
        let source = if !source_cache.contains_key(file_id) {
            let loaded = resolve_source(registry, file_id)?;
            source_cache.insert(file_id, loaded);
            source_cache.get(file_id).expect("just inserted")
        } else {
            source_cache.get(file_id).expect("checked above")
        };
        let edits = req.edits.get(file_id);

        match page {
            ExportItem::Image { .. } => {
                if source.kind != DocKind::Image {
                    return Err(anyhow::Error::new(UserFacingError::with_meta(
                        "invalid_export_item_kind",
                        serde_json::json!({
                            "fileId": file_id,
                            "expected": "image",
                            "actual": source.kind.as_str()
                        }),
                    )));
                }
                composer.push_image_page(
                    &source.original_path,
                    image_fit,
                    quarter_turns_for_image(edits)?,
                    req.optimize.as_ref(),
                )?;
            }
            ExportItem::Pdf { .. } => {
                if source.kind != DocKind::Pdf {
                    return Err(anyhow::Error::new(UserFacingError::with_meta(
                        "invalid_export_item_kind",
                        serde_json::json!({
                            "fileId": file_id,
                            "expected": "pdf",
                            "actual": source.kind.as_str()
                        }),
                    )));
                }
                let page_num = pdf_page_num.unwrap_or_default();
                if page_num < 1 {
                    return Err(anyhow::Error::new(UserFacingError::with_meta(
                        "invalid_page_num",
                        serde_json::json!({ "fileId": file_id, "pageNum": page_num }),
                    )));
                }
                {
                    let entry = load_cached_pdf_source(
                        &mut pdf_cache,
                        file_id,
                        &source.original_path,
                        &source.name,
                    )?;
                    composer.push_pdf_page(
                        &entry.doc,
                        &mut entry.memo,
                        &source.name,
                        page_num,
                        quarter_turns_for_pdf_page(edits, page_num)?,
                    )?;
                }

                if should_evict_pdf_cache {
                    pdf_cache.remove(file_id);
                }
            }
        };

        if index % 10 == 0 {
            let progress =
                ((index as f64 / req.pages.len().max(1) as f64) * 55.0).round() as u8 + 5;
            emit_progress(app, "merging-pages", progress.min(60));
        }
    }

    composer.finish()
}

/// Performs the full export pipeline: compose pages, optionally optimize images, then save.
///
/// Progress is emitted via `"merge-progress"` events on the provided `app` handle.
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
            match page {
                ExportItem::Pdf { file_id, page_num } => {
                    eprintln!(
                        "[fyler]   item[{index}] kind=pdf file_id={file_id} page_num={page_num}"
                    );
                }
                ExportItem::Image { file_id } => {
                    eprintln!("[fyler]   item[{index}] kind=image file_id={file_id}");
                }
            }
        }
    }

    let mut warnings: Vec<MergeWarning> = Vec::new();
    let image_fit_raw = req
        .optimize
        .as_ref()
        .and_then(|options| options.image_fit.as_deref())
        .map(str::to_owned);
    let image_fit = image_fit_raw
        .as_deref()
        .and_then(ImageFit::parse)
        .unwrap_or(ImageFit::Fit);

    if let Some(value) = image_fit_raw.as_deref() {
        if ImageFit::parse(value).is_none() {
            warnings.push(MergeWarning {
                code: "unknown_image_fit_defaulted".to_string(),
                meta: Some(serde_json::json!({ "value": value, "defaultedTo": "fit" })),
            });
        }
    }

    if req.pages.is_empty() {
        return Err(anyhow::Error::new(UserFacingError::new(
            "no_documents_to_merge",
        )));
    }

    let mut merged = compose_document(app, registry, &req, image_fit.as_str())?;

    let mut optimization_failed_count = 0;
    if let Some(options) = &req.optimize {
        let has_pdf_sources = req
            .pages
            .iter()
            .any(|page| matches!(page, ExportItem::Pdf { .. }));

        // The optimizer is meant for images already embedded inside PDFs.
        // Imported image pages are handled by the imported-image pipeline and should not be
        // re-processed here, especially for image-only exports.
        if has_pdf_sources && optimize::has_optimization_work(options) {
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
    emit_progress(app, "done", 100);
    Ok(MergeResult {
        optimization_failed_count,
        warnings,
    })
}
