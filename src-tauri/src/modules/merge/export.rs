use lopdf::Document as PdfDoc;

#[cfg(test)]
mod tests;

use super::compose::compose_document;
use super::contracts::{ExportItem, MergeRequest, MergeResult, OptimizeOptions};
use super::progress::emit_progress;
use super::ProgressSink;

use crate::capabilities::pdf::{
    composition::deduplicate_large_image_streams,
    optimization::{self, OptimizationOptions},
};
use crate::modules::sources::SourceLookup;
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

use super::ports::OutputWriter;

fn has_pdf_sources(pages: &[ExportItem]) -> bool {
    pages
        .iter()
        .any(|page| matches!(page, ExportItem::Pdf { .. }))
}

fn optimization_options(options: &OptimizeOptions) -> OptimizationOptions {
    let profile = crate::capabilities::raster_compression::resolve_page_profile(
        options.preset,
        options.jpeg_quality,
        options.target_dpi,
    );
    OptimizationOptions {
        jpeg_quality: if profile.preset.is_none() {
            profile.jpeg_quality
        } else {
            None
        },
        target_dpi: profile.target_dpi,
    }
}

fn should_optimize_images(pages: &[ExportItem], options: &OptimizeOptions) -> bool {
    has_pdf_sources(pages) && optimization::has_optimization_work(&optimization_options(options))
}

fn validate_export_request(req: &MergeRequest) -> anyhow::Result<()> {
    if req.pages.is_empty() {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::NoDocumentsToMerge,
        )));
    }

    Ok(())
}

fn maybe_optimize_document<S: ProgressSink + ?Sized>(
    sink: &S,
    merged: &mut PdfDoc,
    req: &MergeRequest,
) -> anyhow::Result<usize> {
    if let Some(options) = &req.optimize {
        if should_optimize_images(&req.pages, options) {
            emit_progress(sink, "optimizing-images", 80);
            let options = optimization_options(options);
            return Ok(optimization::optimize_images(merged, &options)?.failed_non_fatal);
        }
    }

    Ok(0)
}

fn save_document<S: ProgressSink + ?Sized>(
    sink: &S,
    writer: &dyn OutputWriter,
    merged: &mut PdfDoc,
    output_path: &str,
) -> anyhow::Result<()> {
    emit_progress(sink, "saving", 90);
    optimization::cleanup_document(merged);
    writer.write(output_path, merged)?;
    emit_progress(sink, "saving", 100);
    Ok(())
}

/// Performs the full export pipeline: compose pages, optionally optimize images, then save.
///
/// Progress is reported through the provided merge-owned [`ProgressSink`].
pub(crate) fn export_pdf<R: SourceLookup, S: ProgressSink + ?Sized>(
    sink: &S,
    registry: &R,
    writer: &dyn OutputWriter,
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
    let mut merged = compose_document(sink, registry, &req)?;
    deduplicate_large_image_streams(&mut merged);
    let optimization_failed_count = maybe_optimize_document(sink, &mut merged, &req)?;
    save_document(sink, writer, &mut merged, &req.output_path)?;
    Ok(MergeResult {
        optimization_failed_count,
    })
}
