use lopdf::Document as PdfDoc;
use tauri::AppHandle;

mod compose;
mod progress;
mod source_cache;

use compose::compose_document;
use progress::emit_progress;

use crate::error::{UserFacingError, UserFacingErrorCode};
use crate::models::{ExportItem, MergeRequest, MergeResult, OptimizeOptions};
use crate::optimize;
use crate::source_registry::SourceRegistry;

fn has_pdf_sources(pages: &[ExportItem]) -> bool {
    pages
        .iter()
        .any(|page| matches!(page, ExportItem::Pdf { .. }))
}

fn should_optimize_images(pages: &[ExportItem], options: &OptimizeOptions) -> bool {
    has_pdf_sources(pages) && optimize::has_optimization_work(options)
}

fn validate_export_request(req: &MergeRequest) -> anyhow::Result<()> {
    if req.pages.is_empty() {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::NoDocumentsToMerge,
        )));
    }

    Ok(())
}

fn maybe_optimize_document(
    app: &AppHandle,
    merged: &mut PdfDoc,
    req: &MergeRequest,
) -> anyhow::Result<usize> {
    if let Some(options) = &req.optimize {
        if should_optimize_images(&req.pages, options) {
            emit_progress(app, "optimizing-images", 80);
            return Ok(optimize::optimize_images(merged, options)?.failed_non_fatal);
        }
    }

    Ok(0)
}

fn save_document(app: &AppHandle, merged: &mut PdfDoc, output_path: &str) -> anyhow::Result<()> {
    emit_progress(app, "saving", 90);
    if let Some(parent) = std::path::Path::new(output_path).parent() {
        std::fs::create_dir_all(parent)?;
    }
    optimize::cleanup_document(merged);
    let mut file = std::fs::File::create(output_path)?;
    optimize::save_document(merged, &mut file)?;
    emit_progress(app, "saving", 100);
    Ok(())
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

    validate_export_request(&req)?;
    let mut merged = compose_document(app, registry, &req)?;
    let optimization_failed_count = maybe_optimize_document(app, &mut merged, &req)?;
    save_document(app, &mut merged, &req.output_path)?;
    Ok(MergeResult {
        optimization_failed_count,
    })
}

#[cfg(test)]
mod tests;
