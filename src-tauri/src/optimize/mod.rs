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

use lopdf::{Document as PdfDoc, Object, ObjectId};

use crate::models::OptimizeOptions;

use self::analysis::analyze_image_usages;
use self::candidate::{discover_candidate, CandidateSkipReason, ImageCandidate};
use self::plan::{build_passthrough_plan, build_plan, should_keep_original, usages_for};
use self::raster::DecodedRaster;
use self::rewrite::rewrite_stream;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
/// Counters describing an optimization run.
pub struct OptimizationSummary {
    pub scanned: usize,
    pub optimized: usize,
    pub skipped_unsupported: usize,
    pub skipped_risky: usize,
    pub failed_non_fatal: usize,
}

enum CandidateDecision {
    Optimize(ImageCandidate),
    Skip(CandidateSkipReason),
}

fn can_optimize(opts: &OptimizeOptions) -> bool {
    opts.jpeg_quality.is_some() || opts.target_dpi.is_some()
}

/// Returns true if the provided options would perform any optimization work.
pub fn has_optimization_work(opts: &OptimizeOptions) -> bool {
    can_optimize(opts)
}

fn classify_object(object_id: ObjectId, obj: &Object) -> Option<CandidateDecision> {
    discover_candidate(object_id, obj).map(|result| match result {
        Ok(candidate) => CandidateDecision::Optimize(candidate),
        Err(reason) => CandidateDecision::Skip(reason),
    })
}

fn apply_candidate(
    obj: &mut Object,
    candidate: &ImageCandidate,
    usages: &std::collections::HashMap<ObjectId, Vec<analysis::ImageUsage>>,
    opts: &OptimizeOptions,
) -> anyhow::Result<bool> {
    let usage_slice = usages_for(usages, candidate);
    let plan = build_plan(candidate, usage_slice, opts)
        .or_else(|| build_passthrough_plan(candidate, opts));
    let Some(plan) = plan else {
        return Ok(false);
    };

    let stream = obj.as_stream_mut()?;
    let original_stream = stream.clone();
    let raster = DecodedRaster::decode(stream, candidate)?;
    let raster = raster.resize(plan.resize_to)?;
    let rewritten_size = rewrite_stream(stream, raster, plan.output_encoding)?;
    if should_keep_original(candidate.original_size, rewritten_size) {
        *stream = original_stream;
        return Ok(false);
    }

    Ok(true)
}

/// Rewrites embedded images in-place when optimization is requested.
///
/// Failures are tracked in the returned `OptimizationSummary` and treated as non-fatal.
pub fn optimize_images(
    doc: &mut PdfDoc,
    opts: &OptimizeOptions,
) -> anyhow::Result<OptimizationSummary> {
    if !can_optimize(opts) {
        return Ok(OptimizationSummary::default());
    }

    let usages = analyze_image_usages(doc);
    let mut summary = OptimizationSummary::default();
    let object_ids: Vec<_> = doc.objects.keys().copied().collect();

    for object_id in object_ids {
        let Some(decision) = doc
            .objects
            .get(&object_id)
            .and_then(|obj| classify_object(object_id, obj))
        else {
            continue;
        };

        summary.scanned += 1;
        match decision {
            CandidateDecision::Skip(CandidateSkipReason::Unsupported) => {
                summary.skipped_unsupported += 1;
            }
            CandidateDecision::Skip(CandidateSkipReason::Risky) => {
                summary.skipped_risky += 1;
            }
            CandidateDecision::Optimize(candidate) => {
                let Some(obj) = doc.objects.get_mut(&object_id) else {
                    summary.failed_non_fatal += 1;
                    continue;
                };

                match apply_candidate(obj, &candidate, &usages, opts) {
                    Ok(true) => summary.optimized += 1,
                    Ok(false) => {}
                    Err(_) => summary.failed_non_fatal += 1,
                }
            }
        }
    }

    Ok(summary)
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
