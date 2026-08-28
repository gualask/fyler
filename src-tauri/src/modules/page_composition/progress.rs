use crate::shared::operation_progress::OperationProgressEnvelope;

pub(crate) trait ProgressSink: Send + Sync {
    fn emit(&self, progress: OperationProgressEnvelope);
}

pub(crate) fn emit(sink: &dyn ProgressSink, phase: &'static str, percentage: u8) {
    sink.emit(OperationProgressEnvelope::page_composition(
        phase, percentage,
    ));
}
