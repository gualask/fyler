//! Direct PDF compression that preserves the loaded document object graph.

mod signature;
mod validation;

use anyhow::{Context, Result};
use lopdf::{Document, LoadOptions};

use crate::capabilities::{
    pdf::optimization::{
        cleanup_document, optimize_standalone_images, OptimizationOptions, OptimizationSummary,
    },
    raster_compression::{
        resolve_page_profile, should_keep_original, CompressionPreset, MAX_RASTER_DECODE_BYTES,
    },
};

use signature::contains_digital_signature;
use validation::{capture_geometry, validate_serialized_pdf};

const MAX_PDF_SOURCE_BYTES: u64 = 256 * 1024 * 1024;
const MAX_PDF_DECOMPRESSED_STREAM_BYTES: usize = MAX_RASTER_DECODE_BYTES as usize;

#[derive(Debug)]
pub(crate) struct StandalonePdfRequest<'a> {
    pub source_bytes: &'a [u8],
    pub preset: CompressionPreset,
    pub jpeg_quality: Option<u8>,
}

#[derive(Debug)]
pub(crate) struct StandalonePdfOutput {
    pub bytes: Vec<u8>,
    pub page_count: u32,
    pub optimization: OptimizationSummary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum PdfSkipReason {
    Protected,
    DigitallySigned,
}

#[derive(Debug)]
pub(crate) enum StandalonePdfResult {
    Compressed(StandalonePdfOutput),
    AlreadyOptimized(StandalonePdfOutput),
    Skipped {
        reason: PdfSkipReason,
        page_count: Option<u32>,
    },
    Failed {
        message: String,
    },
}

pub(crate) fn compress_standalone_pdf(request: StandalonePdfRequest<'_>) -> StandalonePdfResult {
    match compress(request) {
        Ok(result) => result,
        Err(error) => StandalonePdfResult::Failed {
            message: format!("{error:#}"),
        },
    }
}

fn compress(request: StandalonePdfRequest<'_>) -> Result<StandalonePdfResult> {
    validate_source_size(request.source_bytes.len())?;
    let document = load_document(request.source_bytes)?;
    let page_count = u32::try_from(document.get_pages().len()).unwrap_or(u32::MAX);
    if let Some(skipped) = skip_result(&document, page_count) {
        return Ok(skipped);
    }

    let profile = resolve_page_profile(Some(request.preset), request.jpeg_quality, None);
    let Some(target_dpi) = profile.target_dpi else {
        anyhow::bail!("Original is not a standalone batch compression preset");
    };
    let (candidate, optimization) = build_candidate(
        document,
        &OptimizationOptions {
            jpeg_quality: request.jpeg_quality.map(|quality| quality.clamp(1, 100)),
            target_dpi: Some(target_dpi),
        },
        request.source_bytes.len(),
    )?;

    if should_keep_original(request.source_bytes.len(), candidate.len()) {
        return Ok(already_optimized(
            request.source_bytes,
            page_count,
            optimization,
        ));
    }

    Ok(StandalonePdfResult::Compressed(StandalonePdfOutput {
        bytes: candidate,
        page_count,
        optimization,
    }))
}

fn load_document(source_bytes: &[u8]) -> Result<Document> {
    Document::load_mem_with_options(
        source_bytes,
        LoadOptions::with_max_decompressed_size(MAX_PDF_DECOMPRESSED_STREAM_BYTES),
    )
    .context("failed to load PDF")
}

fn skip_result(document: &Document, page_count: u32) -> Option<StandalonePdfResult> {
    if document.trailer.get(b"Encrypt").is_ok() || document.was_encrypted() {
        return Some(StandalonePdfResult::Skipped {
            reason: PdfSkipReason::Protected,
            page_count: None,
        });
    }
    contains_digital_signature(document).then_some(StandalonePdfResult::Skipped {
        reason: PdfSkipReason::DigitallySigned,
        page_count: Some(page_count),
    })
}

fn build_candidate(
    mut document: Document,
    options: &OptimizationOptions,
    source_size: usize,
) -> Result<(Vec<u8>, OptimizationSummary)> {
    let geometry = capture_geometry(&document)?;
    let optimization = optimize_standalone_images(&mut document, options)?;
    cleanup_document(&mut document);
    document.compress();

    let mut candidate = Vec::with_capacity(source_size);
    document
        .save_to(&mut candidate)
        .context("failed to serialize compressed PDF")?;
    validate_serialized_pdf(&candidate, &geometry, MAX_PDF_DECOMPRESSED_STREAM_BYTES)?;
    Ok((candidate, optimization))
}

fn already_optimized(
    source_bytes: &[u8],
    page_count: u32,
    optimization: OptimizationSummary,
) -> StandalonePdfResult {
    StandalonePdfResult::AlreadyOptimized(StandalonePdfOutput {
        bytes: source_bytes.to_vec(),
        page_count,
        optimization,
    })
}

fn validate_source_size(source_size: usize) -> Result<()> {
    validate_source_byte_size(u64::try_from(source_size).unwrap_or(u64::MAX))
}

fn validate_source_byte_size(source_size: u64) -> Result<()> {
    anyhow::ensure!(source_size > 0, "PDF input is empty");
    anyhow::ensure!(
        source_size <= MAX_PDF_SOURCE_BYTES,
        "PDF input exceeds the supported size limit"
    );
    Ok(())
}

#[cfg(test)]
mod tests;
