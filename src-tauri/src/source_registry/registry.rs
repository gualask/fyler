use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::vo::DocKind;

use super::preview::ImagePreviewBytes;

static REGISTRY_LOCK_POISON_LOGGED: AtomicBool = AtomicBool::new(false);

#[derive(Clone)]
/// Backend-only representation of an imported source.
pub struct RegisteredSource {
    /// Original filesystem path for this source.
    pub original_path: String,
    /// `"pdf"` or `"image"`.
    pub kind: DocKind,
    /// Password for encrypted PDFs, kept only in process memory.
    pub password: Option<String>,
}

#[derive(Clone)]
/// Thread-safe in-memory registry of imported sources.
///
/// This is stored as Tauri managed state and accessed by commands and the export pipeline.
pub struct SourceRegistry {
    state: Arc<RwLock<RegistryState>>,
}

#[derive(Default)]
struct RegistryState {
    sources_by_id: HashMap<String, RegisteredSource>,
    image_previews_by_id: HashMap<String, ImagePreviewBytes>,
    id_by_original_path: HashMap<String, String>,
    paths_in_progress: HashSet<String>,
    password_required_paths: HashSet<String>,
}

impl RegistryState {
    fn insert_source(&mut self, file_id: String, registered: RegisteredSource) {
        if let Some(previous) = self.sources_by_id.get(&file_id) {
            if previous.original_path != registered.original_path
                && self.id_by_original_path.get(&previous.original_path) == Some(&file_id)
            {
                self.id_by_original_path.remove(&previous.original_path);
            }
        }

        if let Some(previous_id) = self
            .id_by_original_path
            .insert(registered.original_path.clone(), file_id.clone())
        {
            if previous_id != file_id {
                self.sources_by_id.remove(&previous_id);
                self.image_previews_by_id.remove(&previous_id);
            }
        }

        self.password_required_paths
            .remove(&registered.original_path);
        self.paths_in_progress.remove(&registered.original_path);
        self.sources_by_id.insert(file_id, registered);
    }
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
    /// Inserts one source for registry invariant tests.
    pub fn insert_one(&self, file_id: String, registered: RegisteredSource) {
        let mut state = self.write_state();
        state.insert_source(file_id, registered);
    }

    /// Looks up a registered source by its file ID.
    pub fn get(&self, file_id: &str) -> Option<RegisteredSource> {
        self.read_state().sources_by_id.get(file_id).cloned()
    }

    /// Looks up compressed image preview bytes by source ID.
    pub fn get_image_preview(&self, file_id: &str) -> Option<ImagePreviewBytes> {
        self.read_state().image_previews_by_id.get(file_id).cloned()
    }

    #[cfg(test)]
    /// Returns true when the given original path is registered.
    pub fn contains_original_path(&self, path: &str) -> bool {
        self.read_state().id_by_original_path.contains_key(path)
    }

    /// Atomically claims paths for one import batch.
    ///
    /// A path already registered, being processed, or awaiting a password is omitted.
    pub(crate) fn reserve_import_paths(
        &self,
        paths: impl IntoIterator<Item = String>,
    ) -> Vec<String> {
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

    pub(crate) fn cancel_import_paths(&self, paths: &[String]) {
        let mut state = self.write_state();
        for path in paths {
            state.paths_in_progress.remove(path);
        }
    }

    pub(crate) fn finish_import_batch(
        &self,
        reserved_paths: &[String],
        entries: Vec<(String, RegisteredSource)>,
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
        for (file_id, registered) in entries {
            state.insert_source(file_id, registered);
        }
        for (file_id, preview) in previews {
            if state.sources_by_id.contains_key(&file_id) {
                state.image_previews_by_id.insert(file_id, preview);
            }
        }
    }

    /// Claims a protected source while a password attempt is in flight.
    pub(crate) fn begin_unlock(&self, path: &str) -> bool {
        let mut state = self.write_state();
        if !state.password_required_paths.remove(path) {
            return false;
        }
        state.paths_in_progress.insert(path.to_string());
        true
    }

    /// Restores a protected source after a failed password attempt.
    pub(crate) fn restore_pending_unlock(&self, path: &str) {
        let mut state = self.write_state();
        state.paths_in_progress.remove(path);
        if !state.id_by_original_path.contains_key(path) {
            state.password_required_paths.insert(path.to_string());
        }
    }

    /// Completes a protected-source unlock and registers the resulting source atomically.
    pub(crate) fn finish_unlock(&self, path: &str, file_id: String, registered: RegisteredSource) {
        let mut state = self.write_state();
        state.paths_in_progress.remove(path);
        state.password_required_paths.remove(path);
        state.insert_source(file_id, registered);
    }

    /// Drops protected paths that the user explicitly skipped.
    pub fn discard_pending_paths(&self, paths: &[String]) {
        let mut state = self.write_state();
        for path in paths {
            state.password_required_paths.remove(path);
        }
    }

    /// Removes all sources associated with the provided IDs.
    pub fn remove_many(&self, file_ids: &[String]) {
        let mut state = self.write_state();
        for file_id in file_ids {
            if let Some(registered) = state.sources_by_id.remove(file_id) {
                if state.id_by_original_path.get(&registered.original_path) == Some(file_id) {
                    state.id_by_original_path.remove(&registered.original_path);
                }
            }
            state.image_previews_by_id.remove(file_id);
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
