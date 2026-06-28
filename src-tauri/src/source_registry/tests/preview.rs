use std::fs;

use image::{ImageFormat, RgbImage};

use super::super::{files_from_paths, SourceRegistry};
use super::temp_path;

#[test]
fn image_import_generates_compressed_display_preview() -> anyhow::Result<()> {
    let image_path = temp_path("wide-preview", "png");
    RgbImage::new(3200, 800).save_with_format(&image_path, ImageFormat::Png)?;

    let registry = SourceRegistry::default();
    let result = files_from_paths(vec![image_path.to_string_lossy().to_string()], &registry)?;

    assert_eq!(result.files.len(), 1);
    let preview = registry
        .get_image_preview(&result.files[0].id)
        .expect("image preview");
    assert_eq!(preview.mime_type, "image/jpeg");
    assert_eq!(preview.width, 1600);
    assert_eq!(preview.height, 400);
    assert!(!preview.bytes.is_empty());

    registry.remove_many(&[result.files[0].id.clone()]);
    assert!(registry.get_image_preview(&result.files[0].id).is_none());

    let _ = fs::remove_file(image_path);
    Ok(())
}
