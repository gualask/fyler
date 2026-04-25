use tauri::{AppHandle, Emitter};

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    step: &'static str,
    progress: u8,
}

pub(super) fn emit_progress(app: &AppHandle, step: &'static str, progress: u8) {
    let _ = app.emit("merge-progress", ProgressPayload { step, progress });
}

pub(super) fn merge_pages_progress(completed_pages: usize, total_pages: usize) -> u8 {
    let total_pages = total_pages.max(1);
    let clamped_completed = completed_pages.min(total_pages);
    let ratio = clamped_completed as f64 / total_pages as f64;
    (5.0 + (ratio * 55.0)).round() as u8
}

pub(super) fn emit_merge_progress_if_advanced(
    app: &AppHandle,
    completed_pages: usize,
    total_pages: usize,
    last_merge_progress: &mut u8,
) {
    let progress = merge_pages_progress(completed_pages, total_pages).min(60);
    if progress > *last_merge_progress {
        emit_progress(app, "merging-pages", progress);
        *last_merge_progress = progress;
    }
}
