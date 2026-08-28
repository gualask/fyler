use lopdf::Document as PdfDoc;

use super::contracts::ExportItem;
use crate::modules::sources::{RegisteredSource, SourceLookup};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

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

fn resolve_source<R: SourceLookup>(
    registry: &R,
    file_id: &str,
) -> anyhow::Result<RegisteredSource> {
    registry.get(file_id).ok_or_else(|| {
        anyhow::Error::new(UserFacingError::with_meta(
            UserFacingErrorCode::SourceNotFound,
            serde_json::json!({ "fileId": file_id }),
        ))
    })
}

pub(super) fn resolve_cached_source<'cache, 'request, R: SourceLookup>(
    cache: &'cache mut SourceCache<'request>,
    registry: &R,
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
    source: &RegisteredSource,
) -> anyhow::Result<&'a mut CachedPdfSource> {
    if !cache.contains_key(file_id) {
        let doc = match source.password.as_deref() {
            Some(password) => PdfDoc::load_with_password(&source.original_path, password),
            None => PdfDoc::load(&source.original_path),
        }
        .map_err(|_| {
            anyhow::Error::new(UserFacingError::new(UserFacingErrorCode::OpenPdfFailed))
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

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    use super::*;
    use crate::modules::sources::{DocKind, ImagePreviewBytes};

    #[test]
    fn last_use_index_tracks_the_final_position_for_repeated_sources() {
        let pages = vec![
            ExportItem::Pdf {
                file_id: "shared".to_string(),
                page_num: 1,
            },
            ExportItem::Image {
                file_id: "image".to_string(),
            },
            ExportItem::Pdf {
                file_id: "shared".to_string(),
                page_num: 2,
            },
        ];
        let index = build_last_use_index(&pages);

        assert!(!is_last_reference_to_source(&index, "shared", 0));
        assert!(is_last_reference_to_source(&index, "shared", 2));
        assert!(is_last_reference_to_source(&index, "image", 1));
    }

    #[test]
    fn source_cache_memoizes_lookup_for_repeated_items() {
        let lookups = Arc::new(AtomicUsize::new(0));
        let registry = FakeLookup {
            lookups: lookups.clone(),
        };
        let mut cache = SourceCache::new();

        let first = resolve_cached_source(&mut cache, &registry, "source-1")
            .expect("first source lookup should succeed");
        assert_eq!(first.kind, DocKind::Image);
        let second = resolve_cached_source(&mut cache, &registry, "source-1")
            .expect("cached source lookup should succeed");
        assert_eq!(second.original_path, "/tmp/source-1.png");
        assert_eq!(lookups.load(Ordering::Relaxed), 1);
    }

    struct FakeLookup {
        lookups: Arc<AtomicUsize>,
    }

    impl SourceLookup for FakeLookup {
        fn get(&self, file_id: &str) -> Option<RegisteredSource> {
            self.lookups.fetch_add(1, Ordering::Relaxed);
            (file_id == "source-1").then(|| RegisteredSource {
                original_path: "/tmp/source-1.png".to_string(),
                kind: DocKind::Image,
                password: None,
            })
        }

        fn get_image_preview(&self, _file_id: &str) -> Option<ImagePreviewBytes> {
            None
        }
    }
}
