use std::fs;
use std::path::{Path, PathBuf};

use anyhow::Context;
use lopdf::{
    Document as PdfDoc, EncryptionState, EncryptionVersion, Object, Permissions, StringFormat,
};

use super::super::{files_from_paths, SourceRegistry};
use super::temp_path;
use crate::pdf::{count_pages, count_pages_with_password, is_password_required_error};

const TEST_PDF_PASSWORD: &str = "fyler-test";

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

fn encrypted_pdf_path_with_password(label: &str, user_password: &str) -> anyhow::Result<PathBuf> {
    let mut doc = PdfDoc::load(public_fixture("sample-document.pdf")).context("load fixture")?;
    ensure_document_id(&mut doc);
    let state = EncryptionState::try_from(EncryptionVersion::V2 {
        document: &doc,
        owner_password: "fyler-owner",
        user_password,
        key_length: 128,
        permissions: Permissions::default(),
    })?;
    doc.encrypt(&state)?;

    let path = temp_path(label, "pdf");
    let mut file = fs::File::create(&path).context("create encrypted pdf")?;
    doc.save_to(&mut file).context("save encrypted pdf")?;
    Ok(path)
}

fn encrypted_pdf_path(label: &str) -> anyhow::Result<PathBuf> {
    encrypted_pdf_path_with_password(label, TEST_PDF_PASSWORD)
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
fn protected_pdf_stays_deduplicated_until_unlocked_or_skipped() -> anyhow::Result<()> {
    let encrypted_pdf = encrypted_pdf_path("protected-dedupe")?;
    let encrypted_path = encrypted_pdf.to_string_lossy().to_string();
    let registry = SourceRegistry::default();

    let first = files_from_paths(vec![encrypted_path.clone()], &registry)?;
    let duplicate = files_from_paths(vec![encrypted_path.clone()], &registry)?;
    assert_eq!(first.password_required.len(), 1);
    assert!(duplicate.files.is_empty());
    assert!(duplicate.password_required.is_empty());
    assert!(duplicate.skipped.is_empty());

    assert!(registry.begin_unlock(&encrypted_path));
    assert!(!registry.begin_unlock(&encrypted_path));
    registry.restore_pending_unlock(&encrypted_path);

    registry.discard_pending_paths(std::slice::from_ref(&encrypted_path));
    let retried = files_from_paths(vec![encrypted_path.clone()], &registry)?;
    assert_eq!(retried.password_required.len(), 1);

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
fn encrypted_pdf_with_empty_password_does_not_require_user_input() -> anyhow::Result<()> {
    let encrypted_pdf = encrypted_pdf_path_with_password("protected-empty-password", "")?;
    let encrypted_path = encrypted_pdf.to_string_lossy().to_string();

    assert!(count_pages(&encrypted_path)? > 0);

    let _ = fs::remove_file(encrypted_pdf);
    Ok(())
}
