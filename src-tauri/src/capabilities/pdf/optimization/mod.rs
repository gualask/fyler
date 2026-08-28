//! PDF image optimization pipeline.
//!
//! The optimizer rewrites embedded raster image streams to reduce size while keeping export safe:
//! unsupported or risky candidates are skipped; failures are treated as non-fatal so export can
//! still complete.

mod analysis;
mod candidate;
mod plan;
mod raster;
mod rewrite;
mod runner;

use lopdf::Document as PdfDoc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Optional image optimization settings supplied by an owning workflow.
pub struct OptimizationOptions {
    pub jpeg_quality: Option<u8>,
    pub target_dpi: Option<u16>,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
/// Counters describing an optimization run.
pub struct OptimizationSummary {
    pub scanned: usize,
    pub optimized: usize,
    pub skipped_unsupported: usize,
    pub skipped_risky: usize,
    pub failed_non_fatal: usize,
}

fn can_optimize(opts: &OptimizationOptions) -> bool {
    opts.jpeg_quality.is_some() || opts.target_dpi.is_some()
}

/// Returns true if the provided options would perform any optimization work.
pub fn has_optimization_work(opts: &OptimizationOptions) -> bool {
    can_optimize(opts)
}

/// Rewrites embedded images in-place when optimization is requested.
///
/// Failures are tracked in the returned `OptimizationSummary` and treated as non-fatal.
pub fn optimize_images(
    doc: &mut PdfDoc,
    opts: &OptimizationOptions,
) -> anyhow::Result<OptimizationSummary> {
    if !can_optimize(opts) {
        return Ok(OptimizationSummary::default());
    }

    runner::optimize_images(doc, opts, true)
}

/// Rewrites eligible images for a standalone PDF compression run.
///
/// Unlike an in-progress export, a later standalone run may revisit images that carry Fyler's
/// imported-image marker.
pub(crate) fn optimize_standalone_images(
    doc: &mut PdfDoc,
    opts: &OptimizationOptions,
) -> anyhow::Result<OptimizationSummary> {
    if !can_optimize(opts) {
        return Ok(OptimizationSummary::default());
    }

    runner::optimize_images(doc, opts, false)
}

/// Prunes unused objects and renumbers IDs to keep the final file compact.
pub fn cleanup_document(doc: &mut PdfDoc) {
    doc.prune_objects();
    doc.renumber_objects();
}

/// Applies final compression and writes the document to disk.
pub fn save_document(doc: &mut PdfDoc, file: &mut std::fs::File) -> anyhow::Result<()> {
    doc.compress();
    doc.save_to(file)?;
    Ok(())
}

#[cfg(test)]
mod tests;
