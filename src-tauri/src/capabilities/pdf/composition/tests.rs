use super::PdfComposer;
use crate::capabilities::pdf::image_embedding::{ImageFit, QuarterTurn as PdfQuarterTurn};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

use anyhow::Context;
use image::RgbImage;
use lopdf::Document as PdfDoc;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

fn public_fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("public")
        .join("fixtures")
        .join(name)
}

fn assert_page_tree_consistent(doc: &PdfDoc) -> anyhow::Result<()> {
    let pages_id = doc.catalog()?.get(b"Pages")?.as_reference()?;
    let pages = doc.get_dictionary(pages_id)?;
    let kids = pages.get(b"Kids")?.as_array()?;
    let count = pages.get(b"Count")?.as_i64()?;

    for kid in kids {
        let kid_id = kid.as_reference()?;
        doc.get_dictionary(kid_id)
            .with_context(|| format!("Missing page tree child {:?}", kid_id))?;
    }

    let visible = doc.get_pages().len();
    anyhow::ensure!(kids.len() == visible, "page tree kids mismatch");
    anyhow::ensure!(count as usize == visible, "page tree /Count mismatch");
    Ok(())
}

fn temp_output_path(label: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "fyler-{}-{}.pdf",
        label,
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos()
    ))
}

fn save_doc_classic_for_test(doc: &mut PdfDoc, label: &str) -> anyhow::Result<PathBuf> {
    let output = temp_output_path(label);
    let mut file = File::create(&output).with_context(|| format!("create temp output {label}"))?;
    doc.compress();
    doc.save_to(&mut file)
        .with_context(|| format!("save temp output {label}"))?;
    drop(file);
    Ok(output)
}

fn remove_temp_output(path: &Path) {
    let _ = fs::remove_file(path);
}

#[test]
fn composer_export_preserves_valid_page_tree_for_sample_fixture() -> anyhow::Result<()> {
    let fixture = public_fixture("sample-document.pdf");
    let input_size = fs::metadata(&fixture)?.len();
    let source_doc = PdfDoc::load(&fixture).context("load fixture")?;
    let total_pages = source_doc.get_pages().len();
    anyhow::ensure!(
        total_pages >= 2,
        "sample fixture must have at least 2 pages"
    );
    let last_page = total_pages as u32;

    let mut composer = PdfComposer::new();
    let mut memo = std::collections::HashMap::new();
    for page_num in 2..=last_page {
        composer
            .push_pdf_page(&source_doc, &mut memo, page_num, PdfQuarterTurn::Identity)
            .with_context(|| format!("compose page {page_num}"))?;
    }
    let mut merged = composer.finish().context("finish composition")?;

    let output = save_doc_classic_for_test(&mut merged, "sample-regression")
        .unwrap_or_else(|error| panic!("merged document failed to save: {error:#}"));

    let output_doc = PdfDoc::load(&output).context("reload merged output")?;
    let output_size = fs::metadata(&output)?.len();
    assert_page_tree_consistent(&output_doc)?;

    remove_temp_output(&output);

    assert_eq!(output_doc.get_pages().len(), total_pages - 1);
    assert!(
        output_size < input_size * 2,
        "composed output unexpectedly inflated: input={} output={}",
        input_size,
        output_size
    );
    Ok(())
}

#[test]
fn composer_reports_out_of_range_pages_with_the_frontend_contract() -> anyhow::Result<()> {
    let source_doc = PdfDoc::load(public_fixture("sample-document.pdf"))?;
    let total = source_doc.get_pages().len();

    for page_num in [0, total as u32 + 1] {
        let mut composer = PdfComposer::new();
        let mut memo = std::collections::HashMap::new();
        let error = composer
            .push_pdf_page(&source_doc, &mut memo, page_num, PdfQuarterTurn::Identity)
            .expect_err("out-of-range page should fail");
        let user = error
            .downcast_ref::<UserFacingError>()
            .expect("expected page_out_of_range");

        assert_eq!(user.code, UserFacingErrorCode::PageOutOfRange);
        assert_eq!(
            user.meta.as_ref().and_then(|meta| meta.get("pageNum")),
            Some(&serde_json::json!(page_num))
        );
        assert_eq!(
            user.meta.as_ref().and_then(|meta| meta.get("total")),
            Some(&serde_json::json!(total))
        );
    }
    Ok(())
}

#[test]
fn composer_single_page_export_is_smaller_than_full_fixture() -> anyhow::Result<()> {
    let fixture = public_fixture("sample-document.pdf");
    let input_size = fs::metadata(&fixture)?.len();
    let source_doc = PdfDoc::load(&fixture).context("load fixture")?;
    anyhow::ensure!(
        source_doc.get_pages().len() >= 3,
        "sample fixture must have at least 3 pages"
    );

    let mut composer = PdfComposer::new();
    let mut memo = std::collections::HashMap::new();
    composer.push_pdf_page(&source_doc, &mut memo, 3, PdfQuarterTurn::Identity)?;
    let mut merged = composer.finish().context("finish composition")?;

    let output = save_doc_classic_for_test(&mut merged, "sample-single-page")
        .unwrap_or_else(|error| panic!("single-page export failed to save: {error:#}"));
    let output_size = fs::metadata(&output)?.len();
    let output_doc = PdfDoc::load(&output).context("reload single-page output")?;

    remove_temp_output(&output);

    assert_eq!(output_doc.get_pages().len(), 1);
    assert!(
        output_size < input_size,
        "single-page output kept too much payload: input={} output={}",
        input_size,
        output_size
    );
    Ok(())
}

#[test]
fn composer_merge_image_and_single_pdf_page_stays_smaller_than_full_fixture() -> anyhow::Result<()>
{
    let fixture = public_fixture("sample-document.pdf");

    let input_size = fs::metadata(&fixture)?.len();
    let image_path = std::env::temp_dir().join("fyler-merge-regression-image.png");
    RgbImage::new(800, 400).save(&image_path)?;

    let source_doc = PdfDoc::load(&fixture).context("load fixture")?;
    anyhow::ensure!(
        source_doc.get_pages().len() >= 3,
        "sample fixture must have at least 3 pages"
    );
    let mut composer = PdfComposer::new();
    composer.push_image_page(
        image_path.to_string_lossy().as_ref(),
        ImageFit::Contain,
        PdfQuarterTurn::Identity,
        None,
    )?;
    let mut memo = std::collections::HashMap::new();
    composer.push_pdf_page(&source_doc, &mut memo, 3, PdfQuarterTurn::Identity)?;
    let mut merged = composer.finish().context("finish composition")?;

    let output = save_doc_classic_for_test(&mut merged, "image-plus-single-page")
        .unwrap_or_else(|error| panic!("image+page merge failed to save: {error:#}"));
    let output_size = fs::metadata(&output)?.len();
    let output_doc = PdfDoc::load(&output).context("reload image+page output")?;

    remove_temp_output(&output);
    let _ = fs::remove_file(&image_path);

    assert_eq!(output_doc.get_pages().len(), 2);
    assert!(
        output_size < input_size,
        "image+page merge unexpectedly kept full fixture weight: input={} output={}",
        input_size,
        output_size
    );

    Ok(())
}
