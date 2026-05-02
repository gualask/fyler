use lopdf::Document as PdfDoc;

use crate::error::UserFacingError;
use crate::models::ExportItem;
use crate::source_registry::{RegisteredSource, SourceRegistry};

/// In-memory cache for a loaded PDF source during a single export.
///
/// `memo` maps source object IDs to destination object IDs so repeated references are copied once.
pub(super) struct CachedPdfSource {
    pub(super) doc: PdfDoc,
    pub(super) memo: std::collections::HashMap<lopdf::ObjectId, lopdf::ObjectId>,
}

pub(super) type LastUseIndex<'a> = std::collections::HashMap<&'a str, usize>;
pub(super) type PdfSourceCache = std::collections::HashMap<String, CachedPdfSource>;
pub(super) type SourceCache<'a> = std::collections::HashMap<&'a str, RegisteredSource>;

pub(super) fn build_last_use_index(pages: &[ExportItem]) -> LastUseIndex<'_> {
    let mut map = std::collections::HashMap::new();
    for (index, page) in pages.iter().enumerate() {
        map.insert(export_item_file_id(page), index);
    }
    map
}

pub(super) fn export_item_file_id(page: &ExportItem) -> &str {
    match page {
        ExportItem::Pdf { file_id, .. } => file_id.as_str(),
        ExportItem::Image { file_id } => file_id.as_str(),
    }
}

fn resolve_source(
    registry: &SourceRegistry,
    file_id: &str,
) -> anyhow::Result<crate::source_registry::RegisteredSource> {
    registry.get(file_id).ok_or_else(|| {
        anyhow::Error::new(UserFacingError::with_meta(
            "source_not_found",
            serde_json::json!({ "fileId": file_id }),
        ))
    })
}

pub(super) fn resolve_cached_source<'cache, 'request>(
    cache: &'cache mut SourceCache<'request>,
    registry: &SourceRegistry,
    file_id: &'request str,
) -> anyhow::Result<&'cache RegisteredSource> {
    if !cache.contains_key(file_id) {
        let loaded = resolve_source(registry, file_id)?;
        cache.insert(file_id, loaded);
    }
    Ok(cache.get(file_id).expect("just inserted"))
}

pub(super) fn load_cached_pdf_source<'a>(
    cache: &'a mut PdfSourceCache,
    file_id: &str,
    path: &str,
    name: &str,
) -> anyhow::Result<&'a mut CachedPdfSource> {
    if !cache.contains_key(file_id) {
        let doc = PdfDoc::load(path).map_err(|_| {
            anyhow::Error::new(UserFacingError::with_meta(
                "open_pdf_failed",
                serde_json::json!({ "name": name }),
            ))
        })?;
        cache.insert(
            file_id.to_owned(),
            CachedPdfSource {
                doc,
                memo: std::collections::HashMap::new(),
            },
        );
    }
    Ok(cache.get_mut(file_id).expect("just inserted"))
}

pub(super) fn is_last_reference_to_source(
    last_use_index_by_file_id: &LastUseIndex<'_>,
    file_id: &str,
    index: usize,
) -> bool {
    last_use_index_by_file_id.get(file_id).copied() == Some(index)
}
