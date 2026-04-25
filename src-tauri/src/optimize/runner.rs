use std::collections::HashMap;

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

#[derive(Default)]
struct CandidateTaskBatch {
    tasks: Vec<CandidateTask>,
    estimated_bytes: usize,
}

impl CandidateTaskBatch {
    fn push(&mut self, task: CandidateTask) {
        self.estimated_bytes = self.estimated_bytes.saturating_add(task.estimated_bytes());
        self.tasks.push(task);
    }

    fn flush_if_full(&mut self, doc: &mut PdfDoc, summary: &mut OptimizationSummary) {
        if should_flush_batch(&self.tasks, self.estimated_bytes) {
            self.flush(doc, summary);
        }
    }

    fn flush(&mut self, doc: &mut PdfDoc, summary: &mut OptimizationSummary) {
        if self.tasks.is_empty() {
            return;
        }

        let batch = std::mem::take(&mut self.tasks);
        self.estimated_bytes = 0;
        let results: Vec<anyhow::Result<Option<(ObjectId, Stream)>>> =
            batch.into_par_iter().map(process_task).collect();
        for result in results {
            apply_result(doc, result, summary);
        }
    }
}

fn build_task(
    object_id: ObjectId,
    obj: &Object,
    candidate: &ImageCandidate,
    usages: &HashMap<ObjectId, Vec<ImageUsage>>,
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

fn image_usages_for_options(
    doc: &PdfDoc,
    opts: &OptimizeOptions,
) -> HashMap<ObjectId, Vec<ImageUsage>> {
    if opts.target_dpi.is_some() {
        analyze_image_usages(doc)
    } else {
        HashMap::new()
    }
}

fn object_decision(doc: &PdfDoc, object_id: ObjectId) -> Option<CandidateDecision> {
    doc.objects
        .get(&object_id)
        .and_then(|obj| classify_object(object_id, obj))
}

fn collect_candidate_work(
    doc: &mut PdfDoc,
    object_id: ObjectId,
    decision: CandidateDecision,
    usages: &HashMap<ObjectId, Vec<ImageUsage>>,
    opts: &OptimizeOptions,
    batch: &mut CandidateTaskBatch,
    summary: &mut OptimizationSummary,
) {
    match decision {
        CandidateDecision::Skip(CandidateSkipReason::Unsupported) => {
            summary.skipped_unsupported += 1;
        }
        CandidateDecision::Skip(CandidateSkipReason::Risky) => {
            summary.skipped_risky += 1;
        }
        CandidateDecision::Optimize(candidate) => {
            queue_candidate_task(doc, object_id, candidate, usages, opts, batch, summary);
        }
    }
}

fn queue_candidate_task(
    doc: &mut PdfDoc,
    object_id: ObjectId,
    candidate: ImageCandidate,
    usages: &HashMap<ObjectId, Vec<ImageUsage>>,
    opts: &OptimizeOptions,
    batch: &mut CandidateTaskBatch,
    summary: &mut OptimizationSummary,
) {
    let task = match doc.objects.get(&object_id) {
        Some(obj) => build_task(object_id, obj, &candidate, usages, opts),
        None => {
            summary.failed_non_fatal += 1;
            return;
        }
    };

    match task {
        Ok(Some(task)) => {
            batch.push(task);
            batch.flush_if_full(doc, summary);
        }
        Ok(None) => {}
        Err(_) => summary.failed_non_fatal += 1,
    }
}

pub(super) fn optimize_images(
    doc: &mut PdfDoc,
    opts: &OptimizeOptions,
) -> anyhow::Result<OptimizationSummary> {
    let usages = image_usages_for_options(doc, opts);
    let mut summary = OptimizationSummary::default();
    let object_ids: Vec<_> = doc.objects.keys().copied().collect();
    let mut batch = CandidateTaskBatch::default();

    for object_id in object_ids {
        let Some(decision) = object_decision(doc, object_id) else {
            continue;
        };

        summary.scanned += 1;
        collect_candidate_work(
            doc,
            object_id,
            decision,
            &usages,
            opts,
            &mut batch,
            &mut summary,
        );
    }

    batch.flush(doc, &mut summary);

    Ok(summary)
}
