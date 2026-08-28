use std::collections::HashMap;

use super::{optimization_options, should_optimize_images, validate_export_request};
use crate::capabilities::raster_compression::CompressionPreset;
use crate::modules::merge::progress::merge_pages_progress;
use crate::modules::merge::{ExportItem, ImageFit, MergeRequest, OptimizeOptions};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

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
fn should_optimize_images_requires_pdf_sources_and_real_work() {
    let work_options = OptimizeOptions {
        preset: None,
        jpeg_quality: Some(80),
        target_dpi: None,
    };
    let no_work_options = OptimizeOptions {
        preset: None,
        jpeg_quality: None,
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
        &no_work_options,
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
fn named_profile_resolves_without_becoming_a_manual_quality_override() {
    let resolved = optimization_options(&OptimizeOptions {
        preset: Some(CompressionPreset::Balanced),
        jpeg_quality: Some(70),
        target_dpi: Some(72),
    });

    assert_eq!(resolved.jpeg_quality, None);
    assert_eq!(resolved.target_dpi, Some(170));
}

#[test]
fn validate_export_request_rejects_empty_requests() {
    let err = match validate_export_request(&merge_request(vec![], None)) {
        Ok(_) => panic!("empty export should fail before composition"),
        Err(err) => err,
    };

    let user = err
        .downcast_ref::<UserFacingError>()
        .expect("expected a user-facing error");
    assert_eq!(user.code, UserFacingErrorCode::NoDocumentsToMerge);
}

fn merge_request(pages: Vec<ExportItem>, optimize: Option<OptimizeOptions>) -> MergeRequest {
    MergeRequest {
        pages,
        edits: HashMap::new(),
        output_path: "/tmp/fyler-test-output.pdf".to_string(),
        image_fit: ImageFit::Fit,
        optimize,
    }
}
