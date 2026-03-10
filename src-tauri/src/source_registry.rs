use std::collections::HashMap;
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
    sources: RwLock<HashMap<String, RegisteredSource>>,
}

pub struct FilesFromPathsResult {
    pub files: Vec<SourceFile>,
    pub skipped_errors: Vec<String>,
}

impl SourceRegistry {
    pub fn insert_many(&self, entries: impl IntoIterator<Item = (String, RegisteredSource)>) {
        let mut sources = self.sources.write().expect("source registry poisoned");
        sources.extend(entries);
    }

    pub fn get(&self, file_id: &str) -> Option<RegisteredSource> {
        self.sources
            .read()
            .expect("source registry poisoned")
            .get(file_id)
            .cloned()
    }

    pub fn remove_many(&self, file_ids: &[String]) {
        let mut sources = self.sources.write().expect("source registry poisoned");
        for file_id in file_ids {
            sources.remove(file_id);
        }
    }
}

fn registered_file_from_path(path: String) -> anyhow::Result<Option<(SourceFile, RegisteredSource)>> {
    let name = std::path::Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let Some(kind) = detect_kind_from_ext(&path) else {
        return Ok(None);
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

    Ok(Some((source, registered)))
}

pub fn files_from_paths(
    paths: impl IntoIterator<Item = String>,
    registry: &SourceRegistry,
) -> anyhow::Result<FilesFromPathsResult> {
    let results = paths
        .into_iter()
        .collect::<Vec<_>>()
        .into_par_iter()
        .map(|path| match registered_file_from_path(path) {
            Ok(Some(entry)) => Ok(Some(entry)),
            Ok(None) => Ok(None),
            Err(error) => Err(error.to_string()),
        })
        .collect::<Vec<_>>();

    let mut entries = Vec::new();
    let mut skipped_errors = Vec::new();
    for result in results {
        match result {
            Ok(Some(entry)) => entries.push(entry),
            Ok(None) => {}
            Err(error) => skipped_errors.push(error),
        }
    }

    if entries.is_empty() && !skipped_errors.is_empty() {
        anyhow::bail!(skipped_errors.join("; "));
    }

    registry.insert_many(entries.iter().map(|(source, registered)| (source.id.clone(), registered.clone())));
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
}
