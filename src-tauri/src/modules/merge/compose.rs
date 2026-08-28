use lopdf::Document as PdfDoc;

use super::progress::{emit_merge_progress_if_advanced, emit_progress};
use super::source_cache::{
    build_last_use_index, export_item_file_id, is_last_reference_to_source, load_cached_pdf_source,
    resolve_cached_source, PdfSourceCache, SourceCache,
};
use super::{ExportItem, FileEdits, ImageFit, MergeRequest, OptimizeOptions, ProgressSink};

use crate::capabilities::pdf::composition::PdfComposer;
use crate::capabilities::pdf::image_embedding::{
    ImageEmbeddingOptions, ImageFit as CapabilityImageFit, QuarterTurn as CapabilityQuarterTurn,
};
use crate::modules::sources::{DocKind, RegisteredSource, SourceLookup};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

use super::QuarterTurn;

fn image_fit_for_capability(image_fit: ImageFit) -> CapabilityImageFit {
    match image_fit {
        ImageFit::Fit => CapabilityImageFit::Fit,
        ImageFit::Contain => CapabilityImageFit::Contain,
        ImageFit::Cover => CapabilityImageFit::Cover,
    }
}

fn quarter_turn_for_capability(quarter_turn: QuarterTurn) -> CapabilityQuarterTurn {
    match quarter_turn {
        QuarterTurn::Identity => CapabilityQuarterTurn::Identity,
        QuarterTurn::Clockwise90 => CapabilityQuarterTurn::Clockwise90,
        QuarterTurn::HalfTurn => CapabilityQuarterTurn::HalfTurn,
        QuarterTurn::Clockwise270 => CapabilityQuarterTurn::Clockwise270,
    }
}

fn image_embedding_options(options: Option<&OptimizeOptions>) -> Option<ImageEmbeddingOptions> {
    options.map(|options| {
        let profile = crate::capabilities::raster_compression::resolve_page_profile(
            options.preset,
            options.jpeg_quality,
            options.target_dpi,
        );
        ImageEmbeddingOptions {
            preset: profile.preset,
            jpeg_quality: if profile.preset.is_none() {
                profile.jpeg_quality
            } else {
                None
            },
            target_dpi: profile.target_dpi,
        }
    })
}

fn quarter_turns_for_pdf_page(edits: Option<&FileEdits>, page_num: u32) -> CapabilityQuarterTurn {
    quarter_turn_for_capability(
        edits
            .and_then(|value| value.page_rotations.get(&page_num).copied())
            .unwrap_or_default(),
    )
}

fn quarter_turn_for_image(edits: Option<&FileEdits>) -> CapabilityQuarterTurn {
    quarter_turn_for_capability(edits.map(|value| value.image_rotation).unwrap_or_default())
}

fn invalid_export_item_kind_error(
    file_id: &str,
    expected: DocKind,
    actual: DocKind,
) -> anyhow::Error {
    anyhow::Error::new(UserFacingError::with_meta(
        UserFacingErrorCode::InvalidExportItemKind,
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

fn append_image_export_item(
    composer: &mut PdfComposer,
    source: &RegisteredSource,
    file_id: &str,
    image_fit: CapabilityImageFit,
    edits: Option<&FileEdits>,
    optimize: Option<&ImageEmbeddingOptions>,
) -> anyhow::Result<()> {
    validate_source_kind(source, file_id, DocKind::Image)?;
    composer.push_image_page(
        &source.original_path,
        image_fit,
        quarter_turn_for_image(edits),
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

    let entry = load_cached_pdf_source(pdf_cache, file_id, source)?;
    composer.push_pdf_page(
        &entry.doc,
        &mut entry.memo,
        page_num,
        quarter_turns_for_pdf_page(edits, page_num),
    )?;
    Ok(())
}

pub(super) fn compose_document<R: SourceLookup, S: ProgressSink + ?Sized>(
    sink: &S,
    registry: &R,
    req: &MergeRequest,
) -> anyhow::Result<PdfDoc> {
    emit_progress(sink, "preparing-documents", 0);
    let mut pdf_cache = PdfSourceCache::new();
    let last_use_index_by_file_id = build_last_use_index(&req.pages);
    let mut source_cache = SourceCache::new();
    let mut composer = PdfComposer::new();
    let mut last_merge_progress = 5;
    let image_fit = image_fit_for_capability(req.image_fit);
    let image_options = image_embedding_options(req.optimize.as_ref());

    emit_progress(sink, "merging-pages", 5);
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
                    image_options.as_ref(),
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

        emit_merge_progress_if_advanced(sink, index + 1, req.pages.len(), &mut last_merge_progress);
    }

    composer.finish()
}

#[cfg(test)]
mod tests {
    use super::{invalid_export_item_kind_error, validate_source_kind};
    use crate::modules::sources::{DocKind, RegisteredSource};

    #[test]
    fn source_kind_error_keeps_file_and_expected_actual_metadata() {
        let source = RegisteredSource {
            original_path: "/tmp/source.pdf".to_string(),
            kind: DocKind::Pdf,
            password: None,
        };

        let error = validate_source_kind(&source, "source-1", DocKind::Image)
            .expect_err("a PDF cannot be exported as an image");
        let user = error
            .downcast_ref::<crate::shared::error::UserFacingError>()
            .expect("source kind errors should be user-facing");

        assert_eq!(
            user.code,
            crate::shared::error::UserFacingErrorCode::InvalidExportItemKind
        );
        assert_eq!(
            user.meta.as_ref().expect("source kind metadata"),
            &serde_json::json!({
                "fileId": "source-1",
                "expected": "image",
                "actual": "pdf"
            })
        );
    }

    #[test]
    fn invalid_source_kind_error_builder_matches_validation_payload() {
        let error = invalid_export_item_kind_error("source-2", DocKind::Pdf, DocKind::Image);
        let user = error
            .downcast_ref::<crate::shared::error::UserFacingError>()
            .expect("source kind errors should be user-facing");

        assert_eq!(
            user.meta.as_ref().expect("source kind metadata"),
            &serde_json::json!({
                "fileId": "source-2",
                "expected": "pdf",
                "actual": "image"
            })
        );
    }
}
