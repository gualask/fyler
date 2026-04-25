use std::collections::HashMap;

use super::plan::{prepare_export_plan, resolve_image_fit, should_optimize_images};
use super::progress::merge_pages_progress;
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
