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

    let page_count = if kind == "pdf" { count_pages(&path)? } else { 1 };
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
) -> anyhow::Result<Vec<SourceFile>> {
    let entries = paths
        .into_iter()
        .collect::<Vec<_>>()
        .into_par_iter()
        .filter_map(|path| match registered_file_from_path(path) {
            Ok(Some(entry)) => Some(Ok(entry)),
            Ok(None) => None,
            Err(error) => Some(Err(error)),
        })
        .collect::<anyhow::Result<Vec<_>>>()?;

    registry.insert_many(entries.iter().map(|(source, registered)| (source.id.clone(), registered.clone())));
    Ok(entries.into_iter().map(|(source, _)| source).collect())
}
