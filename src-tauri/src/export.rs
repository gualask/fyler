use lopdf::Document as PdfDoc;
use tauri::{AppHandle, Emitter};

use crate::error::UserFacingError;
use crate::models::{
    ExportItem, FileEdits, MergeRequest, MergeResult, MergeWarning, OptimizeOptions,
};
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

fn merge_pages_progress(completed_pages: usize, total_pages: usize) -> u8 {
    let total_pages = total_pages.max(1);
    let clamped_completed = completed_pages.min(total_pages);
    let ratio = clamped_completed as f64 / total_pages as f64;
    (5.0 + (ratio * 55.0)).round() as u8
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

struct ExportPlan {
    image_fit: ImageFit,
    warnings: Vec<MergeWarning>,
    should_optimize_images: bool,
}

fn resolve_image_fit(options: Option<&OptimizeOptions>) -> (ImageFit, Option<MergeWarning>) {
    let Some(value) = options.and_then(|value| value.image_fit.as_deref()) else {
        return (ImageFit::Fit, None);
    };

    match ImageFit::parse(value) {
        Some(image_fit) => (image_fit, None),
        None => (
            ImageFit::Fit,
            Some(MergeWarning {
                code: "unknown_image_fit_defaulted".to_string(),
                meta: Some(serde_json::json!({ "value": value, "defaultedTo": "fit" })),
            }),
        ),
    }
}

fn has_pdf_sources(pages: &[ExportItem]) -> bool {
    pages
        .iter()
        .any(|page| matches!(page, ExportItem::Pdf { .. }))
}

fn should_optimize_images(pages: &[ExportItem], options: &OptimizeOptions) -> bool {
    has_pdf_sources(pages) && optimize::has_optimization_work(options)
}

fn prepare_export_plan(req: &MergeRequest) -> anyhow::Result<ExportPlan> {
    if req.pages.is_empty() {
        return Err(anyhow::Error::new(UserFacingError::new(
            "no_documents_to_merge",
        )));
    }

    let (image_fit, warning) = resolve_image_fit(req.optimize.as_ref());
    let mut warnings = Vec::new();
    if let Some(warning) = warning {
        warnings.push(warning);
    }

    Ok(ExportPlan {
        image_fit,
        warnings,
        should_optimize_images: req
            .optimize
            .as_ref()
            .is_some_and(|options| should_optimize_images(&req.pages, options)),
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
    let mut source_cache: std::collections::HashMap<
        &str,
        crate::source_registry::RegisteredSource,
    > = std::collections::HashMap::new();
    let mut composer = PdfComposer::new();
    let mut last_merge_progress = 5;

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

        let progress = merge_pages_progress(index + 1, req.pages.len()).min(60);
        if progress > last_merge_progress {
            emit_progress(app, "merging-pages", progress);
            last_merge_progress = progress;
        }
    }

    composer.finish()
}

fn maybe_optimize_document(
    app: &AppHandle,
    merged: &mut PdfDoc,
    req: &MergeRequest,
    plan: &ExportPlan,
) -> anyhow::Result<usize> {
    if let Some(options) = &req.optimize {
        if plan.should_optimize_images {
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
    emit_progress(app, "done", 100);
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

    let plan = prepare_export_plan(&req)?;
    let mut merged = compose_document(app, registry, &req, plan.image_fit.as_str())?;
    let optimization_failed_count = maybe_optimize_document(app, &mut merged, &req, &plan)?;
    save_document(app, &mut merged, &req.output_path)?;
    Ok(MergeResult {
        optimization_failed_count,
        warnings: plan.warnings,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::{
        merge_pages_progress, prepare_export_plan, resolve_image_fit, should_optimize_images,
    };
    use crate::error::UserFacingError;
    use crate::models::{ExportItem, MergeRequest, OptimizeOptions};
    use crate::vo::ImageFit;

    #[test]
    fn merge_pages_progress_spans_the_full_merge_range() {
        assert_eq!(merge_pages_progress(0, 5), 5);
        assert_eq!(merge_pages_progress(1, 5), 16);
        assert_eq!(merge_pages_progress(3, 5), 38);
        assert_eq!(merge_pages_progress(5, 5), 60);
    }

    #[test]
    fn merge_pages_progress_clamps_empty_and_overflow_inputs() {
        assert_eq!(merge_pages_progress(0, 0), 5);
        assert_eq!(merge_pages_progress(1, 0), 60);
        assert_eq!(merge_pages_progress(8, 3), 60);
    }

    #[test]
    fn resolve_image_fit_warns_and_defaults_for_unknown_values() {
        let (image_fit, warning) = resolve_image_fit(Some(&OptimizeOptions {
            jpeg_quality: None,
            image_fit: Some("sideways".to_string()),
            target_dpi: None,
        }));

        assert_eq!(image_fit, ImageFit::Fit);
        let warning = warning.expect("unknown value should add a warning");
        assert_eq!(warning.code, "unknown_image_fit_defaulted");
        assert_eq!(
            warning
                .meta
                .as_ref()
                .and_then(|meta| meta.get("value"))
                .and_then(|value| value.as_str()),
            Some("sideways"),
        );
    }

    #[test]
    fn should_optimize_images_requires_pdf_sources_and_real_work() {
        let work_options = OptimizeOptions {
            jpeg_quality: Some(80),
            image_fit: Some("cover".to_string()),
            target_dpi: None,
        };
        let image_fit_only = OptimizeOptions {
            jpeg_quality: None,
            image_fit: Some("contain".to_string()),
            target_dpi: None,
        };

        assert!(!should_optimize_images(
            &[ExportItem::Image {
                file_id: "image-1".to_string(),
            }],
            &work_options,
        ));
        assert!(!should_optimize_images(
            &[ExportItem::Pdf {
                file_id: "pdf-1".to_string(),
                page_num: 1,
            }],
            &image_fit_only,
        ));
        assert!(should_optimize_images(
            &[ExportItem::Pdf {
                file_id: "pdf-1".to_string(),
                page_num: 1,
            }],
            &work_options,
        ));
    }

    #[test]
    fn prepare_export_plan_rejects_empty_requests() {
        let err = match prepare_export_plan(&merge_request(vec![], None)) {
            Ok(_) => panic!("empty export should fail before composition"),
            Err(err) => err,
        };

        let user = err
            .downcast_ref::<UserFacingError>()
            .expect("expected a user-facing error");
        assert_eq!(user.code, "no_documents_to_merge");
    }

    fn merge_request(pages: Vec<ExportItem>, optimize: Option<OptimizeOptions>) -> MergeRequest {
        MergeRequest {
            pages,
            edits: HashMap::new(),
            output_path: "/tmp/fyler-test-output.pdf".to_string(),
            optimize,
        }
    }
}
