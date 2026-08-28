use std::path::{Path, PathBuf};

use crate::capabilities::pdf::standalone_compression::{
    compress_standalone_pdf, PdfSkipReason, StandalonePdfRequest, StandalonePdfResult,
};
use crate::capabilities::raster_compression::standalone::{
    compress_standalone_image, RasterFileFormat, StandaloneImageRequest, StandaloneImageResult,
    UnsupportedImageReason,
};
use crate::modules::batch_compression::session::RelevantSettings;
use crate::modules::batch_compression::{
    BatchFileResult, BatchFileStatus, BatchFileSystem, BatchSkipReason, PixelDimensions,
};

use super::planning::{ImageExtension, SourceKind, WorkPlan};

const MAX_SOURCE_BYTES: u64 = 256 * 1024 * 1024;
const MAX_WEBP_SOURCE_BYTES: u64 = 64 * 1024 * 1024;

pub(super) struct CompletedItem {
    pub(super) result: BatchFileResult,
    pub(super) settings: RelevantSettings,
    pub(super) owned_output: Option<PathBuf>,
    pub(super) record: bool,
}

pub(super) fn process_one<F: BatchFileSystem>(filesystem: &F, plan: WorkPlan) -> CompletedItem {
    let source_path = Path::new(&plan.source_path);
    let max_bytes = if matches!(
        plan.kind,
        SourceKind::Image {
            source_extension: ImageExtension::WebP
        }
    ) {
        MAX_WEBP_SOURCE_BYTES
    } else {
        MAX_SOURCE_BYTES
    };
    let source_bytes = match filesystem.read_limited(source_path, max_bytes) {
        Ok(bytes) => bytes,
        Err(error) => return failed_item(&plan, None, format!("{error:#}")),
    };
    let original_bytes = u64::try_from(source_bytes.len()).unwrap_or(u64::MAX);
    let produced = match plan.kind {
        SourceKind::Pdf => process_pdf(&plan, &source_bytes),
        SourceKind::Image { .. } => process_image(&plan, &source_bytes),
        SourceKind::Unsupported => unreachable!("unsupported inputs are resolved while planning"),
    };
    let Produced::Output {
        bytes,
        status,
        original_dimensions,
        output_dimensions,
        page_count,
        format,
    } = produced
    else {
        return complete_non_output(plan, produced, original_bytes);
    };

    let output_slot = format
        .and_then(|format| {
            plan.output_slots
                .iter()
                .find(|slot| output_extension_matches_format(&slot.path, format))
        })
        .or_else(|| (format.is_none()).then(|| &plan.output_slots[0]));
    let Some(output_slot) = output_slot else {
        return failed_item(
            &plan,
            Some(original_bytes),
            "Source content does not match its filename extension".to_string(),
        );
    };
    if let Err(error) = filesystem.commit(&output_slot.path, &bytes, output_slot.mode) {
        return failed_item(
            &plan,
            Some(original_bytes),
            format!("Failed to commit output: {error:#}"),
        );
    }
    if let Some(previous) = plan.previous_output.as_ref().filter(|previous| {
        **previous != output_slot.path && previous.parent() == output_slot.path.parent()
    }) {
        if let Err(error) = filesystem.remove_owned(previous) {
            let rollback = filesystem.remove_owned(&output_slot.path);
            let suffix = rollback
                .err()
                .map(|rollback| format!("; failed to roll back new output: {rollback:#}"))
                .unwrap_or_default();
            return failed_item(
                &plan,
                Some(original_bytes),
                format!("Failed to remove prior session output: {error:#}{suffix}"),
            );
        }
    }

    let output_bytes = u64::try_from(bytes.len()).unwrap_or(u64::MAX);
    let committed_path = output_slot.path.clone();
    let output_path = committed_path.to_string_lossy().to_string();
    CompletedItem {
        result: BatchFileResult {
            source_id: plan.source_id,
            source_path: plan.source_path,
            output_path: Some(output_path),
            status,
            skip_reason: None,
            message: None,
            original_bytes: Some(original_bytes),
            output_bytes: Some(output_bytes),
            original_dimensions,
            output_dimensions,
            page_count,
        },
        settings: plan.settings,
        owned_output: Some(committed_path),
        record: true,
    }
}

enum Produced {
    Output {
        bytes: Vec<u8>,
        status: BatchFileStatus,
        original_dimensions: Option<PixelDimensions>,
        output_dimensions: Option<PixelDimensions>,
        page_count: Option<u32>,
        format: Option<RasterFileFormat>,
    },
    Skipped(BatchSkipReason, Option<u32>),
    Failed(String),
}

fn process_pdf(plan: &WorkPlan, source_bytes: &[u8]) -> Produced {
    match compress_standalone_pdf(StandalonePdfRequest {
        source_bytes,
        preset: plan.request_settings.preset,
        jpeg_quality: plan.request_settings.jpeg_quality,
    }) {
        StandalonePdfResult::Compressed(output) => {
            let _optimization = output.optimization;
            Produced::Output {
                bytes: output.bytes,
                status: BatchFileStatus::Compressed,
                original_dimensions: None,
                output_dimensions: None,
                page_count: Some(output.page_count),
                format: None,
            }
        }
        StandalonePdfResult::AlreadyOptimized(output) => {
            let _optimization = output.optimization;
            Produced::Output {
                bytes: output.bytes,
                status: BatchFileStatus::AlreadyOptimized,
                original_dimensions: None,
                output_dimensions: None,
                page_count: Some(output.page_count),
                format: None,
            }
        }
        StandalonePdfResult::Skipped { reason, page_count } => Produced::Skipped(
            match reason {
                PdfSkipReason::Protected => BatchSkipReason::ProtectedPdf,
                PdfSkipReason::DigitallySigned => BatchSkipReason::DigitallySignedPdf,
            },
            page_count,
        ),
        StandalonePdfResult::Failed { message } => Produced::Failed(message),
    }
}

fn process_image(plan: &WorkPlan, source_bytes: &[u8]) -> Produced {
    match compress_standalone_image(StandaloneImageRequest {
        source_bytes,
        preset: plan.request_settings.preset,
        output_mode: plan.request_settings.image_output_mode,
        jpeg_quality: plan.request_settings.jpeg_quality,
        jpeg_background: plan.request_settings.jpeg_background,
    }) {
        StandaloneImageResult::Compressed(output) => Produced::Output {
            bytes: output.bytes,
            status: BatchFileStatus::Compressed,
            original_dimensions: Some(output.original_dimensions.into()),
            output_dimensions: Some(output.output_dimensions.into()),
            page_count: None,
            format: Some(output.format),
        },
        StandaloneImageResult::AlreadyOptimized(output) => Produced::Output {
            bytes: output.bytes,
            status: BatchFileStatus::AlreadyOptimized,
            original_dimensions: Some(output.original_dimensions.into()),
            output_dimensions: Some(output.output_dimensions.into()),
            page_count: None,
            format: Some(output.format),
        },
        StandaloneImageResult::Unsupported { reason } => Produced::Skipped(
            match reason {
                UnsupportedImageReason::UnsupportedFormat => BatchSkipReason::UnsupportedFormat,
                UnsupportedImageReason::AnimatedWebP => BatchSkipReason::AnimatedWebP,
            },
            None,
        ),
        StandaloneImageResult::Failed { message } => Produced::Failed(message),
    }
}

fn complete_non_output(plan: WorkPlan, produced: Produced, original_bytes: u64) -> CompletedItem {
    match produced {
        Produced::Skipped(reason, page_count) => CompletedItem {
            result: skipped_result(
                &plan.source_id,
                &plan.source_path,
                reason,
                Some((original_bytes, page_count)),
            ),
            settings: plan.settings,
            owned_output: plan.previous_output,
            record: true,
        },
        Produced::Failed(message) => failed_item(&plan, Some(original_bytes), message),
        Produced::Output { .. } => unreachable!(),
    }
}

fn failed_item(plan: &WorkPlan, original_bytes: Option<u64>, message: String) -> CompletedItem {
    CompletedItem {
        result: BatchFileResult {
            source_id: plan.source_id.clone(),
            source_path: plan.source_path.clone(),
            output_path: plan
                .previous_output
                .as_ref()
                .map(|path| path.to_string_lossy().to_string()),
            status: BatchFileStatus::Failed,
            skip_reason: None,
            message: Some(message),
            original_bytes,
            output_bytes: None,
            original_dimensions: None,
            output_dimensions: None,
            page_count: None,
        },
        settings: plan.settings,
        owned_output: plan.previous_output.clone(),
        record: false,
    }
}

pub(super) fn skipped_result(
    source_id: &str,
    source_path: &str,
    reason: BatchSkipReason,
    details: Option<(u64, Option<u32>)>,
) -> BatchFileResult {
    BatchFileResult {
        source_id: source_id.to_string(),
        source_path: source_path.to_string(),
        output_path: None,
        status: BatchFileStatus::Skipped,
        skip_reason: Some(reason),
        message: None,
        original_bytes: details.map(|(bytes, _)| bytes),
        output_bytes: None,
        original_dimensions: None,
        output_dimensions: None,
        page_count: details.and_then(|(_, pages)| pages),
    }
}
fn output_extension_matches_format(path: &Path, format: RasterFileFormat) -> bool {
    let extension = path
        .extension()
        .map(|extension| extension.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    extension == format.extension()
        || (format == RasterFileFormat::Jpeg && extension.as_str() == "jpeg")
}
