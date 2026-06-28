use std::fs;

use image::{GenericImageView, ImageFormat, RgbImage, RgbaImage};

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
    assert!(!preview.is_empty());
    let decoded = image::load_from_memory(&preview)?;
    assert_eq!(decoded.dimensions(), (1600, 400));

    registry.remove_many(&[result.files[0].id.clone()]);
    assert!(registry.get_image_preview(&result.files[0].id).is_none());

    let _ = fs::remove_file(image_path);
    Ok(())
}

#[test]
fn transparent_image_preview_flattens_on_white() -> anyhow::Result<()> {
    let image_path = temp_path("transparent-preview", "png");
    RgbaImage::from_pixel(32, 32, image::Rgba([255, 0, 0, 0]))
        .save_with_format(&image_path, ImageFormat::Png)?;

    let registry = SourceRegistry::default();
    let result = files_from_paths(vec![image_path.to_string_lossy().to_string()], &registry)?;

    assert_eq!(result.files.len(), 1);
    let preview = registry
        .get_image_preview(&result.files[0].id)
        .expect("image preview");
    let decoded = image::load_from_memory(&preview)?.to_rgb8();
    let pixel = decoded.get_pixel(0, 0);
    assert!(pixel[0] > 240);
    assert!(pixel[1] > 240);
    assert!(pixel[2] > 240);

    let _ = fs::remove_file(image_path);
    Ok(())
}
