use std::collections::HashSet;
use std::path::Path;
use std::sync::OnceLock;

use rayon::prelude::*;
use rayon::ThreadPoolBuilder;

mod planning;
mod processing;

use planning::{plan_run, PlannedItem};
use processing::{process_one, CompletedItem};

#[cfg(test)]
use super::progress::NoopBatchProgress;
use super::{
    BatchCompressionRequest, BatchCompressionResult, BatchCompressionSession, BatchFileSystem,
    BatchProgressSink, BatchSummary,
};
use crate::capabilities::raster_compression::CompressionPreset;

const BATCH_WORKERS: usize = 2;

static BATCH_POOL: OnceLock<rayon::ThreadPool> = OnceLock::new();

fn batch_pool() -> &'static rayon::ThreadPool {
    BATCH_POOL.get_or_init(|| {
        ThreadPoolBuilder::new()
            .num_threads(BATCH_WORKERS)
            .thread_name(|index| format!("fyler-batch-compression-{index}"))
            .build()
            .expect("failed to build batch compression threadpool")
    })
}

/// Compresses a mixed batch while allocating every output name before parallel work starts.
#[cfg(test)]
pub(crate) fn compress_batch<F: BatchFileSystem>(
    session: &BatchCompressionSession,
    filesystem: &F,
    request: BatchCompressionRequest,
) -> anyhow::Result<BatchCompressionResult> {
    compress_batch_with_progress(&NoopBatchProgress, session, filesystem, request)
}

pub(crate) fn compress_batch_with_progress<F: BatchFileSystem>(
    progress: &dyn BatchProgressSink,
    session: &BatchCompressionSession,
    filesystem: &F,
    request: BatchCompressionRequest,
) -> anyhow::Result<BatchCompressionResult> {
    validate_request(filesystem, &request)?;
    let _active_run = session.begin_run()?;
    let plans = plan_run(session, filesystem, &request);
    let results = batch_pool().install(|| {
        plans
            .into_par_iter()
            .map(|plan| {
                let item = match plan {
                    PlannedItem::Ready(work) => process_one(filesystem, work),
                    PlannedItem::Immediate {
                        result,
                        settings,
                        record,
                    } => CompletedItem {
                        result,
                        settings,
                        owned_output: None,
                        record,
                    },
                };
                if item.record {
                    session.record(
                        item.result.source_id.clone(),
                        item.result.source_path.clone(),
                        item.settings,
                        item.owned_output,
                        item.result.clone(),
                    );
                }
                progress.file_completed(&item.result);
                item.result
            })
            .collect::<Vec<_>>()
    });
    Ok(BatchCompressionResult {
        summary: BatchSummary::from_results(&results),
        files: results,
    })
}

fn validate_request<F: BatchFileSystem>(
    filesystem: &F,
    request: &BatchCompressionRequest,
) -> anyhow::Result<()> {
    anyhow::ensure!(
        request.settings.preset != CompressionPreset::Original,
        "Original is not a batch compression preset"
    );
    let destination = Path::new(&request.destination_path);
    anyhow::ensure!(
        filesystem.is_directory(destination),
        "Batch destination is not an existing directory"
    );
    let mut ids = HashSet::with_capacity(request.files.len());
    for file in &request.files {
        anyhow::ensure!(!file.source_id.is_empty(), "Batch source identity is empty");
        anyhow::ensure!(
            ids.insert(file.source_id.as_str()),
            "Batch source identities must be unique"
        );
    }
    Ok(())
}
#[cfg(test)]
mod tests;
