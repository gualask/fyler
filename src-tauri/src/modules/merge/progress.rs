use crate::shared::operation_progress::OperationProgressEnvelope;

/// Runtime adapter for merge progress notifications.
///
/// The merge workflow owns phase names and percentage ranges, while the inbound adapter owns the
/// transport. Keeping this port narrow prevents the workflow module from depending on runtime
/// types. The adapter receives the shared versioned envelope so future workflows can use the same
/// event without importing merge phases.
pub(crate) trait ProgressSink: Send + Sync {
    fn emit(&self, progress: OperationProgressEnvelope);
}

pub(super) fn emit_progress<S: ProgressSink + ?Sized>(sink: &S, step: &'static str, progress: u8) {
    sink.emit(OperationProgressEnvelope::merge(step, progress));
}

pub(super) fn merge_pages_progress(completed_pages: usize, total_pages: usize) -> u8 {
    let total_pages = total_pages.max(1);
    let clamped_completed = completed_pages.min(total_pages);
    let ratio = clamped_completed as f64 / total_pages as f64;
    (5.0 + (ratio * 55.0)).round() as u8
}

pub(super) fn emit_merge_progress_if_advanced<S: ProgressSink + ?Sized>(
    sink: &S,
    completed_pages: usize,
    total_pages: usize,
    last_merge_progress: &mut u8,
) {
    let progress = merge_pages_progress(completed_pages, total_pages).min(60);
    if progress > *last_merge_progress {
        emit_progress(sink, "merging-pages", progress);
        *last_merge_progress = progress;
    }
}
