use std::collections::{HashMap, HashSet};
use std::sync::RwLock;

use rayon::prelude::*;

use crate::models::SourceFile;
use crate::pdf::{count_pages, detect_kind_from_ext};

#[derive(Clone)]
pub struct RegisteredSource {
    pub original_path: String,
    pub name: String,
    pub kind: String,
}

#[derive(Default)]
pub struct SourceRegistry {
    state: RwLock<RegistryState>,
}

#[derive(Default)]
struct RegistryState {
    sources_by_id: HashMap<String, RegisteredSource>,
    id_by_original_path: HashMap<String, String>,
}

pub struct FilesFromPathsResult {
    pub files: Vec<SourceFile>,
    pub skipped_errors: Vec<String>,
}

impl SourceRegistry {
    pub fn insert_many(&self, entries: impl IntoIterator<Item = (String, RegisteredSource)>) {
        let mut state = self.state.write().expect("source registry poisoned");
        for (file_id, registered) in entries {
            state
                .id_by_original_path
                .insert(registered.original_path.clone(), file_id.clone());
            state.sources_by_id.insert(file_id, registered);
        }
    }

    pub fn get(&self, file_id: &str) -> Option<RegisteredSource> {
        self.state
            .read()
            .expect("source registry poisoned")
            .sources_by_id
            .get(file_id)
            .cloned()
    }

    pub fn contains_original_path(&self, path: &str) -> bool {
        self.state
            .read()
            .expect("source registry poisoned")
            .id_by_original_path
            .contains_key(path)
    }

    pub fn remove_many(&self, file_ids: &[String]) {
        let mut state = self.state.write().expect("source registry poisoned");
        for file_id in file_ids {
            if let Some(registered) = state.sources_by_id.remove(file_id) {
                state.id_by_original_path.remove(&registered.original_path);
            }
        }
    }
}

fn registered_file_from_path(
    path: String,
) -> anyhow::Result<(SourceFile, RegisteredSource)> {
    let name = std::path::Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let Some(kind) = detect_kind_from_ext(&path) else {
        anyhow::bail!("{name}: formato file non supportato");
    };

    let page_count = if kind == "pdf" {
        count_pages(&path).map_err(|error| anyhow::anyhow!("{}: {}", name, error))?
    } else {
        1
    };
    let id = uuid::Uuid::new_v4().to_string();

    let source = SourceFile {
        id: id.clone(),
        original_path: path.clone(),
        name: name.clone(),
        page_count,
        kind: kind.to_string(),
    };
    let registered = RegisteredSource {
        original_path: path,
        name,
        kind: kind.to_string(),
    };

    Ok((source, registered))
}

pub fn files_from_paths(
    paths: impl IntoIterator<Item = String>,
    registry: &SourceRegistry,
) -> anyhow::Result<FilesFromPathsResult> {
    let mut accepted_paths = Vec::new();
    let mut seen_paths = HashSet::new();

    for path in paths {
        if !seen_paths.insert(path.clone()) {
            continue;
        }
        if registry.contains_original_path(&path) {
            continue;
        }
        accepted_paths.push(path);
    }

    let results = accepted_paths
        .into_par_iter()
        .map(|path| match registered_file_from_path(path) {
            Ok(entry) => Ok(entry),
            Err(error) => Err(error.to_string()),
        })
        .collect::<Vec<_>>();

    let mut entries = Vec::new();
    let mut skipped_errors = Vec::new();
    for result in results {
        match result {
            Ok(entry) => entries.push(entry),
            Err(error) => skipped_errors.push(error),
        }
    }

    registry.insert_many(
        entries
            .iter()
            .map(|(source, registered)| (source.id.clone(), registered.clone())),
    );
    Ok(FilesFromPathsResult {
        files: entries.into_iter().map(|(source, _)| source).collect(),
        skipped_errors,
    })
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    use image::RgbImage;

    use super::{files_from_paths, SourceRegistry};

    fn temp_path(name: &str, ext: &str) -> std::path::PathBuf {
        let millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_millis();
        std::env::temp_dir().join(format!("fyler-{name}-{millis}.{ext}"))
    }

    #[test]
    fn keeps_valid_files_when_batch_contains_a_broken_pdf() -> anyhow::Result<()> {
        let image_path = temp_path("valid-image", "png");
        let broken_pdf_path = temp_path("broken-pdf", "pdf");
        RgbImage::new(1, 1).save(&image_path)?;
        fs::write(&broken_pdf_path, b"not a pdf")?;

        let registry = SourceRegistry::default();
        let result = files_from_paths(
            vec![
                image_path.to_string_lossy().to_string(),
                broken_pdf_path.to_string_lossy().to_string(),
            ],
            &registry,
        )?;

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].kind, "image");
        assert_eq!(result.skipped_errors.len(), 1);
        assert!(result.skipped_errors[0].contains("broken-pdf"));

        let _ = fs::remove_file(image_path);
        let _ = fs::remove_file(broken_pdf_path);
        Ok(())
    }

    #[test]
    fn unsupported_files_are_reported_as_skipped_without_failing_the_batch() -> anyhow::Result<()> {
        let path = temp_path("notes", "txt");
        fs::write(&path, b"hello")?;

        let registry = SourceRegistry::default();
        let result = files_from_paths(vec![path.to_string_lossy().to_string()], &registry)?;

        assert!(result.files.is_empty());
        assert_eq!(result.skipped_errors.len(), 1);
        assert!(result.skipped_errors[0].contains("notes"));

        let _ = fs::remove_file(path);
        Ok(())
    }

    #[test]
    fn duplicate_paths_already_in_registry_are_ignored_silently() -> anyhow::Result<()> {
        let image_path = temp_path("duplicate-image", "png");
        RgbImage::new(1, 1).save(&image_path)?;

        let registry = SourceRegistry::default();
        let first = files_from_paths(vec![image_path.to_string_lossy().to_string()], &registry)?;
        assert_eq!(first.files.len(), 1);

        let second = files_from_paths(vec![image_path.to_string_lossy().to_string()], &registry)?;
        assert!(second.files.is_empty());
        assert!(second.skipped_errors.is_empty());

        registry.remove_many(&first.files.iter().map(|file| file.id.clone()).collect::<Vec<_>>());
        let _ = fs::remove_file(image_path);
        Ok(())
    }

    #[test]
    fn mixed_batch_keeps_valid_files_and_reports_only_real_skips() -> anyhow::Result<()> {
        let existing_path = temp_path("existing-image", "png");
        let new_path = temp_path("new-image", "png");
        let unsupported_path = temp_path("unsupported", "txt");
        RgbImage::new(1, 1).save(&existing_path)?;
        RgbImage::new(1, 1).save(&new_path)?;
        fs::write(&unsupported_path, b"hello")?;

        let registry = SourceRegistry::default();
        let first = files_from_paths(vec![existing_path.to_string_lossy().to_string()], &registry)?;
        assert_eq!(first.files.len(), 1);

        let result = files_from_paths(
            vec![
                existing_path.to_string_lossy().to_string(),
                new_path.to_string_lossy().to_string(),
                unsupported_path.to_string_lossy().to_string(),
            ],
            &registry,
        )?;

        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].original_path, new_path.to_string_lossy().to_string());
        assert_eq!(result.skipped_errors.len(), 1);
        assert!(result.skipped_errors[0].contains("unsupported"));

        let mut ids = first.files.iter().map(|file| file.id.clone()).collect::<Vec<_>>();
        ids.extend(result.files.iter().map(|file| file.id.clone()));
        registry.remove_many(&ids);
        let _ = fs::remove_file(existing_path);
        let _ = fs::remove_file(new_path);
        let _ = fs::remove_file(unsupported_path);
        Ok(())
    }
}
