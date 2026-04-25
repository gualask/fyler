use lopdf::Document as PdfDoc;
use tauri::AppHandle;

use super::progress::{emit_merge_progress_if_advanced, emit_progress};
use super::source_cache::{
    build_last_use_index, export_item_file_id, is_last_reference_to_source, load_cached_pdf_source,
    resolve_cached_source, PdfSourceCache, SourceCache,
};

use crate::error::UserFacingError;
use crate::models::{ExportItem, FileEdits, MergeRequest, OptimizeOptions};
use crate::pdf::validate_quarter_turns;
use crate::pdf_compose::PdfComposer;
use crate::source_registry::{RegisteredSource, SourceRegistry};
use crate::vo::DocKind;

fn quarter_turns_for_pdf_page(edits: Option<&FileEdits>, page_num: u32) -> anyhow::Result<u8> {
    let turns = edits
        .and_then(|value| value.page_rotations.get(&page_num).copied())
        .unwrap_or(0);
    validate_quarter_turns(turns)?;
    Ok(turns)
}

fn quarter_turns_for_image(edits: Option<&FileEdits>) -> anyhow::Result<u8> {
    let turns = edits.map(|value| value.image_rotation).unwrap_or(0);
    validate_quarter_turns(turns)?;
    Ok(turns)
}

fn invalid_export_item_kind_error(
    file_id: &str,
    expected: DocKind,
    actual: DocKind,
) -> anyhow::Error {
    anyhow::Error::new(UserFacingError::with_meta(
        "invalid_export_item_kind",
        serde_json::json!({
            "fileId": file_id,
            "expected": expected.as_str(),
            "actual": actual.as_str()
        }),
    ))
}

fn validate_source_kind(
    source: &RegisteredSource,
    file_id: &str,
    expected: DocKind,
) -> anyhow::Result<()> {
    if source.kind == expected {
        return Ok(());
    }

    Err(invalid_export_item_kind_error(
        file_id,
        expected,
        source.kind,
    ))
}

fn validate_pdf_page_num(file_id: &str, page_num: u32) -> anyhow::Result<()> {
    if page_num >= 1 {
        return Ok(());
    }

    Err(anyhow::Error::new(UserFacingError::with_meta(
        "invalid_page_num",
        serde_json::json!({ "fileId": file_id, "pageNum": page_num }),
    )))
}

fn append_image_export_item(
    composer: &mut PdfComposer,
    source: &RegisteredSource,
    file_id: &str,
    image_fit: &str,
    edits: Option<&FileEdits>,
    optimize: Option<&OptimizeOptions>,
) -> anyhow::Result<()> {
    validate_source_kind(source, file_id, DocKind::Image)?;
    composer.push_image_page(
        &source.original_path,
        image_fit,
        quarter_turns_for_image(edits)?,
        optimize,
    )?;
    Ok(())
}

fn append_pdf_export_item(
    composer: &mut PdfComposer,
    pdf_cache: &mut PdfSourceCache,
    source: &RegisteredSource,
    file_id: &str,
    page_num: u32,
    edits: Option<&FileEdits>,
) -> anyhow::Result<()> {
    validate_source_kind(source, file_id, DocKind::Pdf)?;
    validate_pdf_page_num(file_id, page_num)?;

    let entry = load_cached_pdf_source(pdf_cache, file_id, &source.original_path, &source.name)?;
    composer.push_pdf_page(
        &entry.doc,
        &mut entry.memo,
        &source.name,
        page_num,
        quarter_turns_for_pdf_page(edits, page_num)?,
    )?;
    Ok(())
}

pub(super) fn compose_document(
    app: &AppHandle,
    registry: &SourceRegistry,
    req: &MergeRequest,
    image_fit: &str,
) -> anyhow::Result<PdfDoc> {
    emit_progress(app, "preparing-documents", 0);
    let mut pdf_cache = PdfSourceCache::new();
    let last_use_index_by_file_id = build_last_use_index(&req.pages);
    let mut source_cache = SourceCache::new();
    let mut composer = PdfComposer::new();
    let mut last_merge_progress = 5;

    emit_progress(app, "merging-pages", 5);
    for (index, page) in req.pages.iter().enumerate() {
        // Evict per-source cached PDFs once we've appended their last referenced page.
        // This keeps memory usage bounded even if users export very large compositions.
        let file_id = export_item_file_id(page);
        let is_last_source_reference =
            is_last_reference_to_source(&last_use_index_by_file_id, file_id, index);
        let source = resolve_cached_source(&mut source_cache, registry, file_id)?;
        let edits = req.edits.get(file_id);

        match page {
            ExportItem::Image { .. } => {
                append_image_export_item(
                    &mut composer,
                    source,
                    file_id,
                    image_fit,
                    edits,
                    req.optimize.as_ref(),
                )?;
            }
            ExportItem::Pdf { page_num, .. } => {
                append_pdf_export_item(
                    &mut composer,
                    &mut pdf_cache,
                    source,
                    file_id,
                    *page_num,
                    edits,
                )?;

                if is_last_source_reference {
                    pdf_cache.remove(file_id);
                }
            }
        };

        emit_merge_progress_if_advanced(app, index + 1, req.pages.len(), &mut last_merge_progress);
    }

    composer.finish()
}
