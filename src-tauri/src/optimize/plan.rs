use std::collections::HashMap;

use crate::models::OptimizeOptions;

use super::analysis::ImageUsage;
use super::candidate::{ImageCandidate, SourceEncoding};

const AUTO_DPI_HYSTERESIS: f32 = 25.0;
const MIN_LONG_SIDE_PX: u32 = 256;
const MIN_REDUCTION_RATIO: f32 = 0.12;
const MIN_AUTO_JPEG_SOURCE_BYTES: usize = 128 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Output encoding chosen for the rewritten image stream.
pub enum OutputEncoding {
    /// Store raw pixels (removes compression filters).
    Raw,
    /// Re-encode as JPEG at the given quality.
    Jpeg(u8),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Concrete optimization plan for a single image candidate.
pub struct OptimizationPlan {
    /// Resize target (in pixels) before re-encoding.
    pub resize_to: Option<(u32, u32)>,
    pub output_encoding: OutputEncoding,
}

/// Builds an optimization plan for a candidate when a resize is beneficial.
pub fn build_plan(
    candidate: &ImageCandidate,
    usages: Option<&[ImageUsage]>,
    opts: &OptimizeOptions,
) -> Option<OptimizationPlan> {
    let resize_to = choose_resize(candidate, usages, opts)?;
    let output_encoding = choose_output_encoding(candidate, opts, resize_to)?;

    Some(OptimizationPlan {
        resize_to: Some(resize_to),
        output_encoding,
    })
}

/// Builds a plan that keeps the original dimensions but may change encoding.
pub fn build_passthrough_plan(
    candidate: &ImageCandidate,
    opts: &OptimizeOptions,
) -> Option<OptimizationPlan> {
    let output_encoding =
        choose_output_encoding(candidate, opts, (candidate.width, candidate.height))?;
    Some(OptimizationPlan {
        resize_to: None,
        output_encoding,
    })
}

/// Returns true when rewriting is not worth it (insufficient size reduction).
pub fn should_keep_original(original_size: usize, rewritten_size: usize) -> bool {
    let threshold = (original_size as f32 * (1.0 - MIN_REDUCTION_RATIO)).floor() as usize;
    rewritten_size >= threshold
}

fn choose_resize(
    candidate: &ImageCandidate,
    usages: Option<&[ImageUsage]>,
    opts: &OptimizeOptions,
) -> Option<(u32, u32)> {
    let chosen = resize_by_target_dpi(candidate, usages, opts.target_dpi.map(f32::from))?;

    let original_area = u64::from(candidate.width) * u64::from(candidate.height);
    let next_area = u64::from(chosen.0) * u64::from(chosen.1);
    if next_area >= original_area {
        return None;
    }

    if chosen.0.max(chosen.1) < MIN_LONG_SIDE_PX {
        return None;
    }

    Some(chosen)
}

fn resize_by_target_dpi(
    candidate: &ImageCandidate,
    usages: Option<&[ImageUsage]>,
    target_dpi: Option<f32>,
) -> Option<(u32, u32)> {
    let target_dpi = target_dpi?;
    let usages = usages?;
    let effective_dpi = usages
        .iter()
        .filter_map(|usage| effective_dpi(candidate, usage))
        .reduce(f32::min)?;

    if effective_dpi <= target_dpi + AUTO_DPI_HYSTERESIS {
        return None;
    }

    let scale = target_dpi / effective_dpi;
    Some((
        ((candidate.width as f32 * scale).round() as u32).max(1),
        ((candidate.height as f32 * scale).round() as u32).max(1),
    ))
}

fn effective_dpi(candidate: &ImageCandidate, usage: &ImageUsage) -> Option<f32> {
    let draw_width_in = usage.drawn_width_pt / 72.0;
    let draw_height_in = usage.drawn_height_pt / 72.0;
    if draw_width_in <= 0.0 || draw_height_in <= 0.0 {
        return None;
    }

    let dpi_x = candidate.width as f32 / draw_width_in;
    let dpi_y = candidate.height as f32 / draw_height_in;
    Some(dpi_x.min(dpi_y))
}

fn choose_output_encoding(
    candidate: &ImageCandidate,
    opts: &OptimizeOptions,
    dimensions: (u32, u32),
) -> Option<OutputEncoding> {
    if let Some(quality) = opts.jpeg_quality {
        return Some(OutputEncoding::Jpeg(quality.clamp(1, 100)));
    }

    if opts.target_dpi.is_some() {
        if dimensions != (candidate.width, candidate.height) || should_auto_jpeg_raw(candidate) {
            let quality = auto_quality(candidate, dimensions);
            return Some(OutputEncoding::Jpeg(quality));
        }
        return None;
    }

    if dimensions != (candidate.width, candidate.height) {
        return Some(OutputEncoding::Raw);
    }

    None
}

fn should_auto_jpeg_raw(candidate: &ImageCandidate) -> bool {
    matches!(candidate.source_encoding, SourceEncoding::Raw)
        && candidate.original_size >= MIN_AUTO_JPEG_SOURCE_BYTES
        && candidate.width.max(candidate.height) >= MIN_LONG_SIDE_PX
}

fn auto_quality(candidate: &ImageCandidate, dimensions: (u32, u32)) -> u8 {
    let before = candidate.width.max(candidate.height) as f32;
    let after = dimensions.0.max(dimensions.1) as f32;
    let scale = if before > 0.0 { after / before } else { 1.0 };

    match scale {
        s if s <= 0.45 => 68,
        s if s <= 0.70 => 72,
        s if s <= 0.90 => 76,
        _ if matches!(candidate.source_encoding, SourceEncoding::Jpeg) => 82,
        _ => 80,
    }
}

/// Returns the usage slice for a candidate (if present).
pub fn usages_for<'a>(
    usages: &'a HashMap<lopdf::ObjectId, Vec<ImageUsage>>,
    candidate: &ImageCandidate,
) -> Option<&'a [ImageUsage]> {
    usages.get(&candidate.object_id).map(Vec::as_slice)
}
