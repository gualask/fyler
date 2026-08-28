use std::collections::{HashMap, HashSet};

use crate::modules::sources::{ImagePreviewBytes, RegisteredSource};

#[derive(Default)]
pub(super) struct RegistryState {
    pub(super) sources_by_id: HashMap<String, RegisteredSource>,
    pub(super) image_previews_by_id: HashMap<String, ImagePreviewBytes>,
    pub(super) id_by_original_path: HashMap<String, String>,
    pub(super) paths_in_progress: HashSet<String>,
    pub(super) password_required_paths: HashSet<String>,
    pub(super) generated_source_ids: HashSet<String>,
}

impl RegistryState {
    pub(super) fn insert_source(&mut self, file_id: String, registered: RegisteredSource) {
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
