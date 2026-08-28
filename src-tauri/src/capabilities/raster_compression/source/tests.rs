use super::{
    source_format, source_image_dimensions, source_image_requires_orientation,
    validate_image_dimensions, validate_source_byte_size, with_source_image, SourceImageFormat,
    MAX_SOURCE_IMAGE_BYTES, MAX_WEBP_INPUT_BYTES,
};
use image::{GenericImageView, ImageFormat, RgbImage};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Barrier};

#[test]
fn detects_jpeg_format() {
    assert_eq!(
        source_format(Some(ImageFormat::Jpeg)),
        SourceImageFormat::Jpeg
    );
}

#[test]
fn detects_png_format() {
    assert_eq!(
        source_format(Some(ImageFormat::Png)),
        SourceImageFormat::Png
    );
}

#[test]
fn detects_webp_format() {
    assert_eq!(
        source_format(Some(ImageFormat::WebP)),
        SourceImageFormat::WebP
    );
}

#[test]
fn image_dimensions_enforce_both_axis_and_pixel_budgets() {
    assert!(validate_image_dimensions(8_000, 8_000).is_ok());
    assert!(validate_image_dimensions(0, 100).is_err());
    assert!(validate_image_dimensions(32_769, 1).is_err());
    assert!(validate_image_dimensions(16_384, 16_384).is_err());
}

#[test]
fn source_byte_limits_are_format_specific_and_exact() {
    assert!(validate_source_byte_size(MAX_SOURCE_IMAGE_BYTES, false).is_ok());
    assert!(validate_source_byte_size(MAX_SOURCE_IMAGE_BYTES + 1, false).is_err());
    assert!(validate_source_byte_size(MAX_WEBP_INPUT_BYTES, true).is_ok());
    assert!(validate_source_byte_size(MAX_WEBP_INPUT_BYTES + 1, true).is_err());
}

fn jpeg_with_orientation(width: u32, height: u32, orientation: u16) -> anyhow::Result<Vec<u8>> {
    let mut jpeg = crate::capabilities::raster_compression::encode_jpeg(
        &vec![96; (width * height * 3) as usize],
        width,
        height,
        crate::capabilities::raster_compression::JpegColor::Rgb,
        92,
    )?;
    let mut exif = vec![
        b'I', b'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0,
    ];
    exif.extend_from_slice(&orientation.to_le_bytes());
    exif.extend_from_slice(&[0, 0, 0, 0, 0, 0]);
    let mut app1 = b"Exif\0\0".to_vec();
    app1.extend_from_slice(&exif);
    let segment_len = u16::try_from(app1.len() + 2)?;
    let mut oriented = vec![0xff, 0xd8, 0xff, 0xe1];
    oriented.extend_from_slice(&segment_len.to_be_bytes());
    oriented.extend_from_slice(&app1);
    oriented.extend_from_slice(&jpeg.split_off(2));
    Ok(oriented)
}

#[test]
fn source_dimensions_and_decode_apply_exif_orientation() -> anyhow::Result<()> {
    let path = std::env::temp_dir().join(format!(
        "fyler-oriented-source-{}.jpg",
        uuid::Uuid::new_v4()
    ));
    std::fs::write(&path, jpeg_with_orientation(4, 2, 6)?)?;

    assert_eq!(
        source_image_dimensions(path.to_string_lossy().as_ref())?,
        (2, 4)
    );
    assert!(source_image_requires_orientation(
        path.to_string_lossy().as_ref()
    )?);
    with_source_image(path.to_string_lossy().as_ref(), |image, descriptor| {
        assert_eq!(image.dimensions(), (2, 4));
        assert_eq!((descriptor.width, descriptor.height), (2, 4));
        Ok(())
    })?;

    let _ = std::fs::remove_file(path);
    Ok(())
}

#[test]
fn source_image_operations_do_not_overlap_their_pixel_buffer_phase() -> anyhow::Result<()> {
    const WORKERS: usize = 4;
    let path = std::env::temp_dir().join(format!("fyler-image-gate-{}.png", uuid::Uuid::new_v4()));
    RgbImage::new(2, 2).save(&path)?;
    let path = Arc::new(path);
    let barrier = Arc::new(Barrier::new(WORKERS));
    let active = Arc::new(AtomicUsize::new(0));
    let max_active = Arc::new(AtomicUsize::new(0));

    let handles = (0..WORKERS)
        .map(|_| {
            let path = path.clone();
            let barrier = barrier.clone();
            let active = active.clone();
            let max_active = max_active.clone();
            std::thread::spawn(move || -> anyhow::Result<()> {
                barrier.wait();
                with_source_image(path.to_string_lossy().as_ref(), |_image, _descriptor| {
                    let now = active.fetch_add(1, Ordering::SeqCst) + 1;
                    max_active.fetch_max(now, Ordering::SeqCst);
                    std::thread::sleep(std::time::Duration::from_millis(10));
                    active.fetch_sub(1, Ordering::SeqCst);
                    Ok(())
                })
            })
        })
        .collect::<Vec<_>>();

    for handle in handles {
        handle.join().expect("image operation worker")?;
    }
    assert_eq!(max_active.load(Ordering::SeqCst), 1);
    let _ = std::fs::remove_file(path.as_ref());
    Ok(())
}
