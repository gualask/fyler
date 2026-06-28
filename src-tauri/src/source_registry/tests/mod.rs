use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

mod import;
mod preview;
mod protected_pdf;

fn temp_path(name: &str, ext: &str) -> PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_millis();
    std::env::temp_dir().join(format!("fyler-{name}-{millis}.{ext}"))
}
