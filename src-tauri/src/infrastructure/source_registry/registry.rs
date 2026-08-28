use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::modules::page_composition::GeneratedRasterStore;
use crate::modules::sources::{
    ImagePreviewBytes, RegisteredSource, SourceImport, SourceLifecycle, SourceLookup,
    SourceRegistration,
};

use super::state::RegistryState;

static REGISTRY_LOCK_POISON_LOGGED: AtomicBool = AtomicBool::new(false);
const WORKSPACE_IMAGE_PREVIEW_LONG_SIDE: u32 = 1600;

#[derive(Clone)]
/// Thread-safe in-memory registry of imported sources.
///
/// This is stored as Tauri managed state and accessed by source commands and the export pipeline.
pub(crate) struct SourceRegistry {
    state: Arc<RwLock<RegistryState>>,
}

impl SourceRegistry {
    fn read_state(&self) -> RwLockReadGuard<'_, RegistryState> {
        match self.state.read() {
            Ok(guard) => guard,
            Err(poisoned) => {
                if !REGISTRY_LOCK_POISON_LOGGED.swap(true, Ordering::Relaxed) {
                    eprintln!(
                        "[fyler] SourceRegistry lock poisoned (read); continuing best-effort"
                    );
                }
                poisoned.into_inner()
            }
        }
    }

    fn write_state(&self) -> RwLockWriteGuard<'_, RegistryState> {
        match self.state.write() {
            Ok(guard) => guard,
            Err(poisoned) => {
                if !REGISTRY_LOCK_POISON_LOGGED.swap(true, Ordering::Relaxed) {
                    eprintln!(
                        "[fyler] SourceRegistry lock poisoned (write); continuing best-effort"
                    );
                }
                poisoned.into_inner()
            }
        }
    }

    #[cfg(test)]
    pub(crate) fn insert_one(&self, file_id: String, registered: RegisteredSource) {
        let mut state = self.write_state();
        state.insert_source(file_id, registered);
    }

    #[cfg(test)]
    pub(crate) fn contains_original_path(&self, path: &str) -> bool {
        self.read_state().id_by_original_path.contains_key(path)
    }
}

impl GeneratedRasterStore for SourceRegistry {
    fn register_generated_raster(
        &self,
        jpeg_bytes: &[u8],
    ) -> anyhow::Result<crate::modules::sources::SourceFile> {
        anyhow::ensure!(!jpeg_bytes.is_empty(), "generated raster is empty");
        let id = uuid::Uuid::new_v4().to_string();
        let path = std::env::temp_dir().join(format!("fyler-page-composition-{id}.jpg"));
        std::fs::write(&path, jpeg_bytes)?;
        let path_string = path.to_string_lossy().to_string();
        // PDF.js already produced a bounded display-ready JPEG; decoding and re-encoding it here
        // would delay confirmation without improving the composition preview.
        let preview = jpeg_bytes.to_vec();
        let source = crate::modules::sources::SourceFile {
            id: id.clone(),
            original_path: path_string.clone(),
            name: "PDF page raster.jpg".to_string(),
            byte_size: jpeg_bytes.len() as u64,
            page_count: Some(1),
            kind: crate::modules::sources::DocKind::Image,
        };
        let registered = RegisteredSource {
            original_path: path_string,
            kind: crate::modules::sources::DocKind::Image,
            password: None,
        };

        let mut state = self.write_state();
        state.insert_source(id.clone(), registered);
        state.image_previews_by_id.insert(id.clone(), preview);
        state.generated_source_ids.insert(id);
        Ok(source)
    }
}

impl SourceLookup for SourceRegistry {
    fn get(&self, file_id: &str) -> Option<RegisteredSource> {
        self.read_state().sources_by_id.get(file_id).cloned()
    }

    fn get_image_preview(&self, file_id: &str) -> Option<ImagePreviewBytes> {
        self.read_state().image_previews_by_id.get(file_id).cloned()
    }
}

impl SourceImport for SourceRegistry {
    fn detect_kind_from_ext(&self, path: &str) -> Option<crate::modules::sources::DocKind> {
        super::source_format::detect_kind_from_ext(path)
    }

    fn source_file_name(&self, path: &str) -> String {
        super::file_metadata::source_file_name(path)
    }

    fn source_byte_size(&self, path: &str) -> u64 {
        super::file_metadata::source_byte_size(path)
    }

    fn make_image_preview(&self, path: &str) -> anyhow::Result<ImagePreviewBytes> {
        crate::capabilities::raster_compression::generate_image_preview(
            path,
            WORKSPACE_IMAGE_PREVIEW_LONG_SIDE,
        )
    }

    fn make_image_preview_with_long_side(
        &self,
        path: &str,
        max_long_side: u32,
    ) -> anyhow::Result<ImagePreviewBytes> {
        crate::capabilities::raster_compression::generate_image_preview(path, max_long_side)
    }
}

impl SourceLifecycle for SourceRegistry {
    fn reserve_import_paths(&self, paths: impl IntoIterator<Item = String>) -> Vec<String> {
        let mut state = self.write_state();
        let mut accepted = Vec::new();
        let mut seen = HashSet::new();

        for path in paths {
            if !seen.insert(path.clone())
                || state.id_by_original_path.contains_key(&path)
                || state.paths_in_progress.contains(&path)
                || state.password_required_paths.contains(&path)
            {
                continue;
            }
            state.paths_in_progress.insert(path.clone());
            accepted.push(path);
        }

        accepted
    }

    fn cancel_import_paths(&self, paths: &[String]) {
        let mut state = self.write_state();
        for path in paths {
            state.paths_in_progress.remove(path);
        }
    }

    fn finish_import_batch(
        &self,
        reserved_paths: &[String],
        entries: Vec<SourceRegistration>,
        previews: Vec<(String, ImagePreviewBytes)>,
        password_required_paths: &[String],
    ) {
        let mut state = self.write_state();
        for path in reserved_paths {
            state.paths_in_progress.remove(path);
        }
        for path in password_required_paths {
            if !state.id_by_original_path.contains_key(path) {
                state.password_required_paths.insert(path.clone());
            }
        }
        for entry in entries {
            state.insert_source(entry.source.id, entry.registered);
        }
        for (file_id, preview) in previews {
            if state.sources_by_id.contains_key(&file_id) {
                state.image_previews_by_id.insert(file_id, preview);
            }
        }
    }

    fn begin_unlock(&self, path: &str) -> bool {
        let mut state = self.write_state();
        if !state.password_required_paths.remove(path) {
            return false;
        }
        state.paths_in_progress.insert(path.to_string());
        true
    }

    fn restore_pending_unlock(&self, path: &str) {
        let mut state = self.write_state();
        state.paths_in_progress.remove(path);
        if !state.id_by_original_path.contains_key(path) {
            state.password_required_paths.insert(path.to_string());
        }
    }

    fn finish_unlock(&self, path: &str, registration: SourceRegistration) {
        let mut state = self.write_state();
        state.paths_in_progress.remove(path);
        state.password_required_paths.remove(path);
        state.insert_source(registration.source.id, registration.registered);
    }

    fn discard_pending_paths(&self, paths: &[String]) {
        let mut state = self.write_state();
        for path in paths {
            state.password_required_paths.remove(path);
        }
    }

    fn remove_many(&self, file_ids: &[String]) {
        let mut state = self.write_state();
        let mut generated_paths = Vec::new();
        for file_id in file_ids {
            if let Some(registered) = state.sources_by_id.remove(file_id) {
                if state.id_by_original_path.get(&registered.original_path) == Some(file_id) {
                    state.id_by_original_path.remove(&registered.original_path);
                }
                if state.generated_source_ids.remove(file_id) {
                    generated_paths.push(registered.original_path);
                }
            }
            state.image_previews_by_id.remove(file_id);
        }
        drop(state);
        for path in generated_paths {
            let _ = std::fs::remove_file(path);
        }
    }
}

impl Default for SourceRegistry {
    fn default() -> Self {
        Self {
            state: Arc::new(RwLock::new(RegistryState::default())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_raster_reuses_confirmed_jpeg_as_its_preview() {
        let fixture = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../public/fixtures/sample-image.jpg");
        let jpeg_bytes = std::fs::read(fixture).expect("JPEG fixture");
        let registry = SourceRegistry::default();

        let source = registry
            .register_generated_raster(&jpeg_bytes)
            .expect("register raster");

        assert_eq!(
            registry.get_image_preview(&source.id),
            Some(jpeg_bytes.clone())
        );
        assert_eq!(
            std::fs::read(&source.original_path).expect("stored raster"),
            jpeg_bytes
        );

        registry.remove_many(&[source.id]);
        assert!(!std::path::Path::new(&source.original_path).exists());
    }
}
