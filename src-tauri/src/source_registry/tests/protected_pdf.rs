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
