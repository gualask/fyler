use lopdf::{Document as PdfDoc, Object, ObjectId, Stream};
use rayon::prelude::*;

use crate::models::OptimizeOptions;

use super::analysis::{analyze_image_usages, ImageUsage};
use super::candidate::{discover_candidate, CandidateSkipReason, ImageCandidate};
use super::plan::{
    build_passthrough_plan, build_plan, should_keep_original, usages_for, OptimizationPlan,
};
use super::raster::DecodedRaster;
use super::rewrite::rewrite_stream;
use super::OptimizationSummary;

const MAX_BATCH_TASKS: usize = 64;
const MAX_BATCH_ESTIMATED_BYTES: usize = 256 * 1024 * 1024;

enum CandidateDecision {
    Optimize(ImageCandidate),
    Skip(CandidateSkipReason),
}

fn classify_object(object_id: ObjectId, obj: &Object) -> Option<CandidateDecision> {
    discover_candidate(object_id, obj).map(|result| match result {
        Ok(candidate) => CandidateDecision::Optimize(candidate),
        Err(reason) => CandidateDecision::Skip(reason),
    })
}

#[derive(Clone)]
struct CandidateTask {
    object_id: ObjectId,
    candidate: ImageCandidate,
    plan: OptimizationPlan,
    stream: Stream,
}

impl CandidateTask {
    fn estimated_bytes(&self) -> usize {
        let decoded_bytes = (self.candidate.width as usize)
            .saturating_mul(self.candidate.height as usize)
            .saturating_mul(self.candidate.color_space.components());
        self.stream.content.len().max(decoded_bytes)
    }
}

fn build_task(
    object_id: ObjectId,
    obj: &Object,
    candidate: &ImageCandidate,
    usages: &std::collections::HashMap<ObjectId, Vec<ImageUsage>>,
    opts: &OptimizeOptions,
) -> anyhow::Result<Option<CandidateTask>> {
    let usage_slice = usages_for(usages, candidate);
    let plan = build_plan(candidate, usage_slice, opts)
        .or_else(|| build_passthrough_plan(candidate, opts));
    let Some(plan) = plan else {
        return Ok(None);
    };

    let stream = obj.as_stream()?.clone();
    Ok(Some(CandidateTask {
        object_id,
        candidate: *candidate,
        plan,
        stream,
    }))
}

fn process_task(task: CandidateTask) -> anyhow::Result<Option<(ObjectId, Stream)>> {
    let raster = DecodedRaster::decode(&task.stream, &task.candidate, task.plan.resize_to)?;
    let raster = raster.resize(task.plan.resize_to)?;
    let mut stream = task.stream;
    let rewritten_size = rewrite_stream(&mut stream, raster, task.plan.output_encoding)?;

    let kept_original = should_keep_original(task.candidate.original_size, rewritten_size);
    if kept_original {
        return Ok(None);
    }

    Ok(Some((task.object_id, stream)))
}

fn apply_result(
    doc: &mut PdfDoc,
    result: anyhow::Result<Option<(ObjectId, Stream)>>,
    summary: &mut OptimizationSummary,
) {
    match result {
        Ok(Some((object_id, stream))) => {
            let Some(obj) = doc.objects.get_mut(&object_id) else {
                summary.failed_non_fatal += 1;
                return;
            };
            *obj = Object::Stream(stream);
            summary.optimized += 1;
        }
        Ok(None) => {}
        Err(_) => summary.failed_non_fatal += 1,
    }
}

fn should_flush_batch(tasks: &[CandidateTask], estimated_bytes: usize) -> bool {
    tasks.len() >= MAX_BATCH_TASKS || estimated_bytes >= MAX_BATCH_ESTIMATED_BYTES
}

fn flush_batch(
    doc: &mut PdfDoc,
    tasks: &mut Vec<CandidateTask>,
    estimated_bytes: &mut usize,
    summary: &mut OptimizationSummary,
) {
    if tasks.is_empty() {
        return;
    }

    let batch = std::mem::take(tasks);
    *estimated_bytes = 0;
    let results: Vec<anyhow::Result<Option<(ObjectId, Stream)>>> =
        batch.into_par_iter().map(process_task).collect();
    for result in results {
        apply_result(doc, result, summary);
    }
}

pub(super) fn optimize_images(
    doc: &mut PdfDoc,
    opts: &OptimizeOptions,
) -> anyhow::Result<OptimizationSummary> {
    let usages = if opts.target_dpi.is_some() {
        analyze_image_usages(doc)
    } else {
        std::collections::HashMap::new()
    };

    let mut summary = OptimizationSummary::default();
    let object_ids: Vec<_> = doc.objects.keys().copied().collect();
    let mut tasks: Vec<CandidateTask> = Vec::new();
    let mut estimated_batch_bytes: usize = 0;

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
                let Some(obj) = doc.objects.get(&object_id) else {
                    summary.failed_non_fatal += 1;
                    continue;
                };
                match build_task(object_id, obj, &candidate, &usages, opts) {
                    Ok(Some(task)) => {
                        estimated_batch_bytes =
                            estimated_batch_bytes.saturating_add(task.estimated_bytes());
                        tasks.push(task);
                        if should_flush_batch(&tasks, estimated_batch_bytes) {
                            flush_batch(doc, &mut tasks, &mut estimated_batch_bytes, &mut summary);
                        }
                    }
                    Ok(None) => {}
                    Err(_) => summary.failed_non_fatal += 1,
                };
            }
        }
    }

    flush_batch(doc, &mut tasks, &mut estimated_batch_bytes, &mut summary);

    Ok(summary)
}
