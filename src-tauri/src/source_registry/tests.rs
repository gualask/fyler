use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use image::RgbImage;

use super::{files_from_paths, SourceRegistry};

fn temp_path(name: &str, ext: &str) -> std::path::PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_millis();
    std::env::temp_dir().join(format!("fyler-{name}-{millis}.{ext}"))
}

#[test]
fn keeps_valid_files_when_batch_contains_a_broken_pdf() -> anyhow::Result<()> {
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
    assert_eq!(result.files[0].kind, "image");
    assert_eq!(result.skipped.len(), 1);
    assert!(result.skipped[0].name.contains("broken-pdf"));
    assert_eq!(result.skipped[0].reason, "read_error");

    let _ = fs::remove_file(image_path);
    let _ = fs::remove_file(broken_pdf_path);
    Ok(())
}

#[test]
fn unsupported_files_are_reported_as_skipped_without_failing_the_batch() -> anyhow::Result<()> {
    let path = temp_path("notes", "txt");
    fs::write(&path, b"hello")?;

    let registry = SourceRegistry::default();
    let result = files_from_paths(vec![path.to_string_lossy().to_string()], &registry)?;

    assert!(result.files.is_empty());
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
