use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::vo::DocKind;

static REGISTRY_LOCK_POISON_LOGGED: AtomicBool = AtomicBool::new(false);

#[derive(Clone)]
/// Backend-only representation of an imported source.
pub struct RegisteredSource {
    /// Original filesystem path for this source.
    pub original_path: String,
    /// Display name (typically filename).
    pub name: String,
    /// `"pdf"` or `"image"`.
    pub kind: DocKind,
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
    id_by_original_path: HashMap<String, String>,
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

    /// Inserts many sources at once.
    ///
    /// If an ID already exists, it is overwritten (last write wins).
    pub fn insert_many(&self, entries: impl IntoIterator<Item = (String, RegisteredSource)>) {
        let mut state = self.write_state();
        for (file_id, registered) in entries {
            state
                .id_by_original_path
                .insert(registered.original_path.clone(), file_id.clone());
            state.sources_by_id.insert(file_id, registered);
        }
    }

    /// Looks up a registered source by its file ID.
    pub fn get(&self, file_id: &str) -> Option<RegisteredSource> {
        self.read_state().sources_by_id.get(file_id).cloned()
    }

    /// Returns true when the given original path is already registered (dedupe guard on import).
    pub fn contains_original_path(&self, path: &str) -> bool {
        self.read_state().id_by_original_path.contains_key(path)
    }

    /// Removes all sources associated with the provided IDs.
    pub fn remove_many(&self, file_ids: &[String]) {
        let mut state = self.write_state();
        for file_id in file_ids {
            if let Some(registered) = state.sources_by_id.remove(file_id) {
                state.id_by_original_path.remove(&registered.original_path);
            }
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
