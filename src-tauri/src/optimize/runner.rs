use lopdf::{Document as PdfDoc, Object, ObjectId, Stream};
use rayon::prelude::*;

use crate::models::OptimizeOptions;

use super::analysis::{self, analyze_image_usages};
use super::candidate::{discover_candidate, CandidateSkipReason, ImageCandidate};
use super::plan::{
    build_passthrough_plan, build_plan, should_keep_original, usages_for, OptimizationPlan,
};
use super::raster::DecodedRaster;
use super::rewrite::rewrite_stream;
use super::OptimizationSummary;

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

fn build_task(
    object_id: ObjectId,
    obj: &Object,
    candidate: &ImageCandidate,
    usages: &std::collections::HashMap<ObjectId, Vec<analysis::ImageUsage>>,
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

pub(super) fn optimize_images(
    doc: &mut PdfDoc,
    opts: &OptimizeOptions,
) -> anyhow::Result<OptimizationSummary> {
    let usages = analyze_image_usages(doc);

    let mut summary = OptimizationSummary::default();
    let object_ids: Vec<_> = doc.objects.keys().copied().collect();
    let mut tasks: Vec<CandidateTask> = Vec::new();

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
                    Ok(Some(task)) => tasks.push(task),
                    Ok(None) => {}
                    Err(_) => summary.failed_non_fatal += 1,
                };
            }
        }
    }

    let results: Vec<anyhow::Result<Option<(ObjectId, Stream)>>> =
        tasks.into_par_iter().map(process_task).collect();

    for result in results {
        match result {
            Ok(Some((object_id, stream))) => {
                let Some(obj) = doc.objects.get_mut(&object_id) else {
                    summary.failed_non_fatal += 1;
                    continue;
                };
                *obj = Object::Stream(stream);
                summary.optimized += 1;
            }
            Ok(None) => {}
            Err(_) => summary.failed_non_fatal += 1,
        }
    }

    Ok(summary)
}

