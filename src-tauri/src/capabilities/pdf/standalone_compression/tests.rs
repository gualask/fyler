use lopdf::{
    dictionary, Document, EncryptionState, EncryptionVersion, Object, Permissions, Stream,
};

use super::{
    compress_standalone_pdf, validate_source_byte_size, PdfSkipReason, StandalonePdfRequest,
    StandalonePdfResult, MAX_PDF_SOURCE_BYTES,
};
use crate::capabilities::{
    pdf::preservation_tests::{feature_fixture, incremental_feature_bytes, non_image_objects},
    raster_compression::CompressionPreset,
};

fn request(bytes: &[u8]) -> StandalonePdfRequest<'_> {
    StandalonePdfRequest {
        source_bytes: bytes,
        preset: CompressionPreset::Balanced,
        jpeg_quality: None,
    }
}

fn save(mut document: Document) -> anyhow::Result<Vec<u8>> {
    let mut bytes = Vec::new();
    document.save_to(&mut bytes)?;
    Ok(bytes)
}

fn first_image_mut(document: &mut Document) -> &mut Stream {
    document
        .objects
        .values_mut()
        .find_map(|object| {
            let stream = object.as_stream_mut().ok()?;
            (stream
                .dict
                .get(b"Subtype")
                .ok()
                .and_then(|value| value.as_name().ok())
                == Some(b"Image".as_slice()))
            .then_some(stream)
        })
        .expect("image stream")
}

fn text_document_with_orphan_stream() -> anyhow::Result<Document> {
    let mut document = Document::with_version("1.4");
    let pages_id = document.new_object_id();
    let font_id = document.add_object(dictionary! {
        "Type" => "Font",
        "Subtype" => "Type1",
        "BaseFont" => "Helvetica",
    });
    let content = b"BT /F1 12 Tf 36 72 Td (Structural compression) Tj ET\n".repeat(2_048);
    let content_id = document.add_object(Stream::new(dictionary! {}, content));
    let page_id = document.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "Contents" => content_id,
        "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
        "Resources" => dictionary! {
            "Font" => dictionary! { "F1" => font_id },
        },
    });
    document.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Count" => 1,
            "Kids" => vec![page_id.into()],
        }),
    );
    let catalog_id = document.add_object(dictionary! {
        "Type" => "Catalog",
        "Pages" => pages_id,
    });
    document.trailer.set("Root", catalog_id);
    document.add_object(Stream::new(
        dictionary! { "Type" => "OrphanFixture" },
        vec![91; 128 * 1_024],
    ));
    Ok(document)
}

#[test]
fn structural_cleanup_compresses_pdf_without_optimizable_images() -> anyhow::Result<()> {
    let source = save(text_document_with_orphan_stream()?)?;

    let StandalonePdfResult::Compressed(output) = compress_standalone_pdf(request(&source)) else {
        anyhow::bail!("structural cleanup should compress the text-only PDF");
    };

    assert_eq!(output.optimization.optimized, 0);
    assert!(output.bytes.len() * 100 <= source.len() * 95);
    let reloaded = Document::load_mem(&output.bytes)?;
    assert!(reloaded.objects.values().all(|object| {
        object
            .type_name()
            .ok()
            .is_none_or(|name| name != b"OrphanFixture")
    }));
    Ok(())
}

#[test]
fn direct_compression_preserves_non_image_objects_and_page_geometry() -> anyhow::Result<()> {
    let source = incremental_feature_bytes();
    let loaded_source = Document::load_mem(&source)?;
    let before = non_image_objects(&loaded_source);
    let before_pages = loaded_source.get_pages();

    let StandalonePdfResult::Compressed(output) = compress_standalone_pdf(request(&source)) else {
        anyhow::bail!("representative PDF should be compressed");
    };

    assert_eq!(output.page_count, 1);
    assert_eq!(output.optimization.optimized, 1);
    assert!(output.bytes.len() * 100 <= source.len() * 95);
    let reloaded = Document::load_mem(&output.bytes)?;
    assert_eq!(reloaded.get_pages(), before_pages);
    assert_eq!(non_image_objects(&reloaded), before);
    let catalog = reloaded.catalog()?;
    for key in [
        b"Outlines".as_slice(),
        b"AcroForm",
        b"Names",
        b"Metadata",
        b"StructTreeRoot",
        b"MarkInfo",
    ] {
        assert!(catalog.has(key));
    }
    Ok(())
}

#[test]
fn standalone_run_may_revisit_a_fyler_imported_image() -> anyhow::Result<()> {
    let mut document = feature_fixture();
    first_image_mut(&mut document)
        .dict
        .set("FylerImportedImage", true);
    let source = save(document)?;

    let StandalonePdfResult::Compressed(output) = compress_standalone_pdf(request(&source)) else {
        anyhow::bail!("a later standalone run should revisit imported images");
    };
    assert_eq!(output.optimization.optimized, 1);
    Ok(())
}

#[test]
fn final_file_guard_restores_original_bytes() -> anyhow::Result<()> {
    let mut document = feature_fixture();
    let bulk_id = document.add_object(Stream::new(
        dictionary! { "Type" => "EmbeddedFile", "Filter" => "DCTDecode" },
        vec![37; 4 * 1024 * 1024],
    ));
    document.catalog_mut()?.set("BulkFixture", bulk_id);
    let source = save(document)?;

    let StandalonePdfResult::AlreadyOptimized(output) = compress_standalone_pdf(request(&source))
    else {
        anyhow::bail!("final PDF saving below five percent must retain the source");
    };
    assert_eq!(output.bytes, source);
    assert_eq!(output.optimization.optimized, 1);
    Ok(())
}

#[test]
fn signed_pdf_is_skipped_without_output() -> anyhow::Result<()> {
    let mut document = feature_fixture();
    document.add_object(dictionary! {
        "Type" => "Sig",
        "ByteRange" => vec![0.into(), 10.into(), 20.into(), 30.into()],
        "Contents" => Object::string_literal("signed"),
    });
    let source = save(document)?;

    assert!(matches!(
        compress_standalone_pdf(request(&source)),
        StandalonePdfResult::Skipped {
            reason: PdfSkipReason::DigitallySigned,
            page_count: Some(1)
        }
    ));
    Ok(())
}

#[test]
fn encrypted_pdfs_are_skipped_with_empty_or_required_passwords() -> anyhow::Result<()> {
    for user_password in ["", "required"] {
        let mut document = feature_fixture();
        let id = Object::string_literal([0x46; 16]);
        document
            .trailer
            .set("ID", Object::Array(vec![id.clone(), id]));
        let encryption = EncryptionState::try_from(EncryptionVersion::V2 {
            document: &document,
            owner_password: "owner",
            user_password,
            key_length: 128,
            permissions: Permissions::default(),
        })?;
        document.encrypt(&encryption)?;
        let source = save(document)?;

        assert!(matches!(
            compress_standalone_pdf(request(&source)),
            StandalonePdfResult::Skipped {
                reason: PdfSkipReason::Protected,
                page_count: None
            }
        ));
    }
    Ok(())
}

#[test]
fn over_limit_embedded_raster_is_retained_as_risky() -> anyhow::Result<()> {
    let mut document = feature_fixture();
    let image = first_image_mut(&mut document);
    image.dict.set("Width", 32_769);
    image.dict.set("Filter", "DCTDecode");
    let source = save(document)?;

    let StandalonePdfResult::AlreadyOptimized(output) = compress_standalone_pdf(request(&source))
    else {
        anyhow::bail!("risky image should leave the PDF unchanged");
    };
    assert_eq!(output.bytes, source);
    assert_eq!(output.optimization.skipped_risky, 1);
    Ok(())
}

#[test]
fn invalid_pdf_is_reported_as_failed() {
    assert!(matches!(
        compress_standalone_pdf(request(b"%PDF-1.7\ninvalid")),
        StandalonePdfResult::Failed { .. }
    ));
}

#[test]
fn source_size_limits_are_exact_without_allocating_the_boundary() {
    assert!(validate_source_byte_size(MAX_PDF_SOURCE_BYTES).is_ok());
    assert!(validate_source_byte_size(MAX_PDF_SOURCE_BYTES + 1).is_err());
    assert!(validate_source_byte_size(0).is_err());
}
