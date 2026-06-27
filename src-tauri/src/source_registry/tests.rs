use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::Context;
use image::RgbImage;
use lopdf::{
    Document as PdfDoc, EncryptionState, EncryptionVersion, Object, Permissions, StringFormat,
};

use super::{files_from_paths, SourceRegistry};
use crate::pdf::{count_pages, count_pages_with_password, is_password_required_error};
use crate::vo::DocKind;

const TEST_PDF_PASSWORD: &str = "fyler-test";

fn temp_path(name: &str, ext: &str) -> std::path::PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_millis();
    std::env::temp_dir().join(format!("fyler-{name}-{millis}.{ext}"))
}

fn public_fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("public")
        .join("fixtures")
        .join(name)
}

fn ensure_document_id(doc: &mut PdfDoc) {
    if doc.trailer.get(b"ID").is_ok() {
        return;
    }

    let id = Object::String(vec![0x46; 16], StringFormat::Literal);
    doc.trailer.set("ID", Object::Array(vec![id.clone(), id]));
}

fn encrypted_pdf_path(label: &str) -> anyhow::Result<PathBuf> {
    let mut doc = PdfDoc::load(public_fixture("sample-document.pdf")).context("load fixture")?;
    ensure_document_id(&mut doc);
    let state = EncryptionState::try_from(EncryptionVersion::V2 {
        document: &doc,
        owner_password: "fyler-owner",
        user_password: TEST_PDF_PASSWORD,
        key_length: 128,
        permissions: Permissions::default(),
    })?;
    doc.encrypt(&state)?;

    let path = temp_path(label, "pdf");
    let mut file = fs::File::create(&path).context("create encrypted pdf")?;
    doc.save_to(&mut file).context("save encrypted pdf")?;
    Ok(path)
}

#[test]
fn invalid_pdfs_are_skipped_without_failing_the_batch() -> anyhow::Result<()> {
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
    assert!(result.password_required.is_empty());
    assert_eq!(result.skipped.len(), 1);
    assert!(result.skipped[0].name.contains("broken-pdf"));
    assert_eq!(result.skipped[0].reason, "read_error");

    let image = result
        .files
        .iter()
        .find(|file| file.kind == DocKind::Image)
        .expect("image should be imported");
    assert_eq!(image.page_count, Some(1));

    let _ = fs::remove_file(image_path);
    let _ = fs::remove_file(broken_pdf_path);
    Ok(())
}

#[test]
fn password_protected_pdfs_are_returned_for_password_resolution() -> anyhow::Result<()> {
    let encrypted_pdf = encrypted_pdf_path("protected-import")?;
    let encrypted_path = encrypted_pdf.to_string_lossy().to_string();

    let registry = SourceRegistry::default();
    let result = files_from_paths(vec![encrypted_path.clone()], &registry)?;

    assert!(result.files.is_empty());
    assert!(result.skipped.is_empty());
    assert_eq!(result.password_required.len(), 1);
    assert_eq!(result.password_required[0].original_path, encrypted_path);
    assert!(result.password_required[0]
        .name
        .contains("protected-import"));
    assert!(result.password_required[0].byte_size > 0);

    let _ = fs::remove_file(encrypted_pdf);
    Ok(())
}

#[test]
fn encrypted_pdf_page_count_requires_the_matching_password() -> anyhow::Result<()> {
    let encrypted_pdf = encrypted_pdf_path("protected-count")?;
    let encrypted_path = encrypted_pdf.to_string_lossy().to_string();

    let without_password = count_pages(&encrypted_path).expect_err("password should be required");
    assert!(is_password_required_error(&without_password));

    let wrong_password =
        count_pages_with_password(&encrypted_path, Some("wrong")).expect_err("wrong password");
    assert!(is_password_required_error(&wrong_password));

    let page_count = count_pages_with_password(&encrypted_path, Some(TEST_PDF_PASSWORD))?;
    assert!(page_count > 0);

    let _ = fs::remove_file(encrypted_pdf);
    Ok(())
}

#[test]
fn unsupported_files_are_reported_as_skipped_without_failing_the_batch() -> anyhow::Result<()> {
    let path = temp_path("notes", "txt");
    fs::write(&path, b"hello")?;

    let registry = SourceRegistry::default();
    let result = files_from_paths(vec![path.to_string_lossy().to_string()], &registry)?;

    assert!(result.files.is_empty());
    assert!(result.password_required.is_empty());
    assert_eq!(result.skipped.len(), 1);
    assert!(result.skipped[0].name.contains("notes"));
    assert_eq!(result.skipped[0].reason, "unsupported_format");

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
    assert!(second.password_required.is_empty());
    assert!(second.skipped.is_empty());

    registry.remove_many(
        &first
            .files
            .iter()
            .map(|file| file.id.clone())
            .collect::<Vec<_>>(),
    );
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
    assert!(result.password_required.is_empty());
    assert_eq!(
        result.files[0].original_path,
        new_path.to_string_lossy().to_string()
    );
    assert_eq!(result.skipped.len(), 1);
    assert!(result.skipped[0].name.contains("unsupported"));
    assert_eq!(result.skipped[0].reason, "unsupported_format");

    let mut ids = first
        .files
        .iter()
        .map(|file| file.id.clone())
        .collect::<Vec<_>>();
    ids.extend(result.files.iter().map(|file| file.id.clone()));
    registry.remove_many(&ids);
    let _ = fs::remove_file(existing_path);
    let _ = fs::remove_file(new_path);
    let _ = fs::remove_file(unsupported_path);
    Ok(())
}
