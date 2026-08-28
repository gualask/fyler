use super::BatchFileResult;

pub(crate) trait BatchProgressSink: Send + Sync {
    fn file_completed(&self, result: &BatchFileResult);
}

#[cfg(test)]
pub(super) struct NoopBatchProgress;

#[cfg(test)]
impl BatchProgressSink for NoopBatchProgress {
    fn file_completed(&self, _result: &BatchFileResult) {}
}
