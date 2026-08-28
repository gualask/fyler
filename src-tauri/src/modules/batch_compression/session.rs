use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};

use super::{BatchCompressionSettings, BatchFileResult};
use crate::capabilities::raster_compression::{
    standalone::StandaloneImageOutputMode, CompressionPreset,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum RelevantSettings {
    Pdf {
        preset: CompressionPreset,
        jpeg_quality: Option<u8>,
    },
    Image {
        preset: CompressionPreset,
        output_mode: StandaloneImageOutputMode,
        jpeg_quality: Option<Option<u8>>,
        jpeg_background: Option<[u8; 3]>,
    },
    Unsupported,
}

impl RelevantSettings {
    pub(super) fn pdf(settings: BatchCompressionSettings) -> Self {
        Self::Pdf {
            preset: settings.preset,
            jpeg_quality: settings.jpeg_quality,
        }
    }

    pub(super) fn image(
        settings: BatchCompressionSettings,
        jpeg_output: bool,
        background_relevant: bool,
    ) -> Self {
        Self::Image {
            preset: settings.preset,
            output_mode: settings.image_output_mode,
            jpeg_quality: jpeg_output.then_some(settings.jpeg_quality),
            jpeg_background: background_relevant.then_some(settings.jpeg_background),
        }
    }
}

#[derive(Debug, Clone)]
struct SessionRecord {
    source_path: String,
    settings: RelevantSettings,
    owned_output: Option<PathBuf>,
    result: BatchFileResult,
}

#[derive(Default)]
struct SessionState {
    active: bool,
    records: HashMap<String, SessionRecord>,
}

/// In-memory output ownership and idempotency state for the current app session.
#[derive(Clone, Default)]
pub(crate) struct BatchCompressionSession {
    state: Arc<Mutex<SessionState>>,
}

impl BatchCompressionSession {
    fn state(&self) -> MutexGuard<'_, SessionState> {
        self.state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub(super) fn begin_run(&self) -> anyhow::Result<ActiveRun<'_>> {
        let mut state = self.state();
        anyhow::ensure!(!state.active, "A batch compression run is already active");
        state.active = true;
        Ok(ActiveRun { session: self })
    }

    pub(super) fn cached_result(
        &self,
        source_id: &str,
        source_path: &str,
        settings: RelevantSettings,
        destination: &std::path::Path,
    ) -> Option<BatchFileResult> {
        self.state().records.get(source_id).and_then(|record| {
            let destination_matches = record
                .owned_output
                .as_ref()
                .is_none_or(|output| output.parent() == Some(destination));
            (record.source_path == source_path
                && record.settings == settings
                && destination_matches)
                .then(|| record.result.clone())
        })
    }

    pub(super) fn owned_output(&self, source_id: &str) -> Option<PathBuf> {
        self.state()
            .records
            .get(source_id)
            .and_then(|record| record.owned_output.clone())
    }

    pub(super) fn owned_outputs(&self) -> HashSet<PathBuf> {
        self.state()
            .records
            .values()
            .filter_map(|record| record.owned_output.clone())
            .collect()
    }

    pub(super) fn record(
        &self,
        source_id: String,
        source_path: String,
        settings: RelevantSettings,
        owned_output: Option<PathBuf>,
        result: BatchFileResult,
    ) {
        self.state().records.insert(
            source_id,
            SessionRecord {
                source_path,
                settings,
                owned_output,
                result,
            },
        );
    }
}

pub(super) struct ActiveRun<'a> {
    session: &'a BatchCompressionSession,
}

impl Drop for ActiveRun<'_> {
    fn drop(&mut self) {
        self.session.state().active = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> BatchCompressionSettings {
        BatchCompressionSettings {
            preset: CompressionPreset::Balanced,
            image_output_mode: StandaloneImageOutputMode::KeepSourceFormat,
            jpeg_quality: None,
            jpeg_background: [255, 255, 255],
        }
    }

    #[test]
    fn non_jpeg_output_ignores_jpeg_only_settings() {
        let base = settings();
        let changed = BatchCompressionSettings {
            jpeg_quality: Some(85),
            jpeg_background: [0, 0, 0],
            ..base
        };

        assert_eq!(
            RelevantSettings::image(base, false, false),
            RelevantSettings::image(changed, false, false)
        );
    }

    #[test]
    fn jpeg_output_tracks_only_relevant_backgrounds() {
        let base = settings();
        let changed = BatchCompressionSettings {
            jpeg_background: [0, 0, 0],
            ..base
        };

        assert_eq!(
            RelevantSettings::image(base, true, false),
            RelevantSettings::image(changed, true, false)
        );
        assert_ne!(
            RelevantSettings::image(base, true, true),
            RelevantSettings::image(changed, true, true)
        );
    }
}
