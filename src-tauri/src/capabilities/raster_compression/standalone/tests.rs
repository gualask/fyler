use std::io::Cursor;

use image::{DynamicImage, ImageFormat, RgbImage, RgbaImage};

use super::{
    compress_standalone_image, output_format, output_quality, RasterFileFormat,
    StandaloneImageOutputMode, StandaloneImageRequest, StandaloneImageResult,
    UnsupportedImageReason,
};
use crate::capabilities::raster_compression::CompressionPreset;

fn request(bytes: &[u8], mode: StandaloneImageOutputMode) -> StandaloneImageRequest<'_> {
    StandaloneImageRequest {
        source_bytes: bytes,
        preset: CompressionPreset::Balanced,
        output_mode: mode,
        jpeg_quality: None,
        jpeg_background: [255, 255, 255],
    }
}

fn png_bytes(image: DynamicImage) -> anyhow::Result<Vec<u8>> {
    let mut bytes = Cursor::new(Vec::new());
    image.write_to(&mut bytes, ImageFormat::Png)?;
    Ok(bytes.into_inner())
}

fn jpeg_bytes(image: DynamicImage) -> anyhow::Result<Vec<u8>> {
    let mut bytes = Cursor::new(Vec::new());
    image.write_to(&mut bytes, ImageFormat::Jpeg)?;
    Ok(bytes.into_inner())
}

fn bmp_bytes(image: DynamicImage) -> anyhow::Result<Vec<u8>> {
    let mut bytes = Cursor::new(Vec::new());
    image.write_to(&mut bytes, ImageFormat::Bmp)?;
    Ok(bytes.into_inner())
}

fn orientation_exif(orientation: u16) -> Vec<u8> {
    let mut exif = vec![
        b'I', b'I', 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0,
    ];
    exif.extend_from_slice(&orientation.to_le_bytes());
    exif.extend_from_slice(&[0, 0, 0, 0, 0, 0]);
    exif
}

fn with_orientation(mut jpeg: Vec<u8>, orientation: u16) -> Vec<u8> {
    let mut app1 = vec![0xff, 0xe1, 0x00, 0x22, b'E', b'x', b'i', b'f', 0, 0];
    app1.extend_from_slice(&orientation_exif(orientation));
    jpeg.splice(2..2, app1);
    jpeg
}

#[test]
fn output_mode_matrix_is_exact() {
    for source in [
        RasterFileFormat::Jpeg,
        RasterFileFormat::Png,
        RasterFileFormat::WebP,
        RasterFileFormat::Bmp,
    ] {
        assert_eq!(
            output_format(source, StandaloneImageOutputMode::ConvertToJpeg),
            RasterFileFormat::Jpeg
        );
        assert_eq!(
            output_format(source, StandaloneImageOutputMode::KeepSourceFormat),
            source
        );
    }
}

#[test]
fn jpeg_override_does_not_change_webp_quality() {
    assert_eq!(output_quality(RasterFileFormat::Jpeg, 85), 85);
    assert_eq!(output_quality(RasterFileFormat::WebP, 85), 92);
}

#[test]
fn source_format_falls_back_to_original_bytes_without_five_percent_saving() -> anyhow::Result<()> {
    let source = jpeg_bytes(DynamicImage::ImageRgb8(RgbImage::from_pixel(
        8,
        8,
        image::Rgb([80, 90, 100]),
    )))?;

    let StandaloneImageResult::AlreadyOptimized(output) = compress_standalone_image(request(
        &source,
        StandaloneImageOutputMode::KeepSourceFormat,
    )) else {
        anyhow::bail!("expected the original JPEG to be retained");
    };
    assert_eq!(output.bytes, source);
    assert_eq!(output.format, RasterFileFormat::Jpeg);
    assert_eq!(output.output_dimensions, output.original_dimensions);
    Ok(())
}

#[test]
fn jpeg_output_falls_back_to_original_jpeg_without_five_percent_saving() -> anyhow::Result<()> {
    let source = jpeg_bytes(DynamicImage::ImageRgb8(RgbImage::from_pixel(
        8,
        8,
        image::Rgb([80, 90, 100]),
    )))?;

    let StandaloneImageResult::AlreadyOptimized(output) =
        compress_standalone_image(request(&source, StandaloneImageOutputMode::ConvertToJpeg))
    else {
        anyhow::bail!("expected an existing JPEG to be retained");
    };
    assert_eq!(output.bytes, source);
    assert_eq!(output.format, RasterFileFormat::Jpeg);
    assert_eq!(output.output_dimensions, output.original_dimensions);
    Ok(())
}

#[test]
fn forced_jpeg_conversion_composites_alpha_and_ignores_size_growth() -> anyhow::Result<()> {
    let source = png_bytes(DynamicImage::ImageRgba8(RgbaImage::from_pixel(
        32,
        32,
        image::Rgba([255, 0, 0, 0]),
    )))?;
    let mut conversion = request(&source, StandaloneImageOutputMode::ConvertToJpeg);
    conversion.jpeg_background = [10, 120, 230];

    let StandaloneImageResult::Compressed(output) = compress_standalone_image(conversion) else {
        anyhow::bail!("forced conversion must produce JPEG");
    };
    assert_eq!(output.format, RasterFileFormat::Jpeg);
    let decoded =
        image::load_from_memory_with_format(&output.bytes, ImageFormat::Jpeg)?.into_rgb8();
    let pixel = decoded.get_pixel(16, 16).0;
    assert!((i16::from(pixel[0]) - 10).abs() <= 4);
    assert!((i16::from(pixel[1]) - 120).abs() <= 4);
    assert!((i16::from(pixel[2]) - 230).abs() <= 4);
    Ok(())
}

#[test]
fn keep_png_preserves_alpha_when_candidate_is_accepted() -> anyhow::Result<()> {
    let mut source = png_bytes(DynamicImage::ImageRgba8(RgbaImage::from_pixel(
        64,
        64,
        image::Rgba([10, 20, 30, 40]),
    )))?;
    source.extend(std::iter::repeat_n(0, 4_096));

    let StandaloneImageResult::Compressed(output) = compress_standalone_image(request(
        &source,
        StandaloneImageOutputMode::KeepSourceFormat,
    )) else {
        anyhow::bail!("expected padded PNG to be recompressed");
    };
    assert_eq!(output.format, RasterFileFormat::Png);
    let decoded =
        image::load_from_memory_with_format(&output.bytes, ImageFormat::Png)?.into_rgba8();
    assert_eq!(decoded.get_pixel(0, 0).0, [10, 20, 30, 40]);
    Ok(())
}

#[test]
fn keep_bmp_reencodes_to_the_same_format() -> anyhow::Result<()> {
    let mut source = bmp_bytes(DynamicImage::ImageRgb8(RgbImage::from_pixel(
        64,
        64,
        image::Rgb([10, 20, 30]),
    )))?;
    source.extend(std::iter::repeat_n(0, 4_096));

    let StandaloneImageResult::Compressed(output) = compress_standalone_image(request(
        &source,
        StandaloneImageOutputMode::KeepSourceFormat,
    )) else {
        anyhow::bail!("expected padded BMP to be recompressed");
    };
    assert_eq!(output.format, RasterFileFormat::Bmp);
    let decoded = image::load_from_memory_with_format(&output.bytes, ImageFormat::Bmp)?;
    assert_eq!((decoded.width(), decoded.height()), (64, 64));
    Ok(())
}

#[test]
fn static_webp_is_reencoded_as_webp_and_preserves_alpha() -> anyhow::Result<()> {
    let rgba = [10, 20, 30, 40].repeat(64 * 64);
    let mut source = webpx::EncoderConfig::new()
        .quality(92.0)
        .encode_rgba(&rgba, 64, 64, webpx::Unstoppable)
        .map_err(|error| anyhow::anyhow!("{error}"))?;
    source.extend(std::iter::repeat_n(0, 4_096));

    let StandaloneImageResult::Compressed(output) = compress_standalone_image(request(
        &source,
        StandaloneImageOutputMode::KeepSourceFormat,
    )) else {
        anyhow::bail!("expected padded static WebP to be recompressed");
    };
    assert_eq!(output.format, RasterFileFormat::WebP);
    let info =
        webpx::ImageInfo::from_webp(&output.bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
    assert!(!info.has_animation);
    assert!(info.has_alpha);
    Ok(())
}

#[test]
fn jpeg_orientation_is_applied_and_metadata_is_not_copied() -> anyhow::Result<()> {
    let source = with_orientation(
        jpeg_bytes(DynamicImage::ImageRgb8(RgbImage::from_pixel(
            2,
            3,
            image::Rgb([50, 100, 150]),
        )))?,
        6,
    );

    let StandaloneImageResult::Compressed(output) =
        compress_standalone_image(request(&source, StandaloneImageOutputMode::ConvertToJpeg))
    else {
        anyhow::bail!("expected oriented JPEG output");
    };
    assert_eq!(output.original_dimensions, (3, 2));
    assert_eq!(output.output_dimensions, (3, 2));
    assert!(!output.bytes.windows(6).any(|window| window == b"Exif\0\0"));
    Ok(())
}

#[test]
fn webp_orientation_is_applied_before_reencoding() -> anyhow::Result<()> {
    let rgb = [50, 100, 150].repeat(2 * 3);
    let source = webpx::EncoderConfig::new()
        .quality(92.0)
        .encode_rgb(&rgb, 2, 3, webpx::Unstoppable)
        .map_err(|error| anyhow::anyhow!("{error}"))?;
    let source = webpx::embed_exif(&source, &orientation_exif(6))
        .map_err(|error| anyhow::anyhow!("{error}"))?;

    let StandaloneImageResult::Compressed(output) =
        compress_standalone_image(request(&source, StandaloneImageOutputMode::ConvertToJpeg))
    else {
        anyhow::bail!("expected oriented WebP conversion");
    };
    assert_eq!(output.original_dimensions, (3, 2));
    assert_eq!(output.output_dimensions, (3, 2));
    Ok(())
}

#[test]
fn animated_webp_is_rejected_before_decode() -> anyhow::Result<()> {
    let mut encoder =
        webpx::AnimationEncoder::new(2, 2).map_err(|error| anyhow::anyhow!("{error}"))?;
    encoder
        .add_frame_rgba(&[255; 2 * 2 * 4], 0)
        .map_err(|error| anyhow::anyhow!("{error}"))?;
    encoder
        .add_frame_rgba(&[0; 2 * 2 * 4], 100)
        .map_err(|error| anyhow::anyhow!("{error}"))?;
    let source = encoder
        .finish(200)
        .map_err(|error| anyhow::anyhow!("{error}"))?;

    assert!(matches!(
        compress_standalone_image(request(
            &source,
            StandaloneImageOutputMode::KeepSourceFormat
        )),
        StandaloneImageResult::Unsupported {
            reason: UnsupportedImageReason::AnimatedWebP
        }
    ));
    Ok(())
}

#[test]
fn gif_is_reported_as_unsupported() {
    let source = b"GIF89a\x01\0\x01\0\0\0\0";
    assert!(matches!(
        compress_standalone_image(request(source, StandaloneImageOutputMode::KeepSourceFormat)),
        StandaloneImageResult::Unsupported {
            reason: UnsupportedImageReason::UnsupportedFormat
        }
    ));
}

#[test]
fn corrupt_supported_input_is_reported_as_failed() {
    let source = b"\x89PNG\r\n\x1a\ncorrupt";
    assert!(matches!(
        compress_standalone_image(request(source, StandaloneImageOutputMode::KeepSourceFormat)),
        StandaloneImageResult::Failed { .. }
    ));
}
