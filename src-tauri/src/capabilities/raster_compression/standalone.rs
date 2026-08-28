use anyhow::{Context, Result};
use image::{DynamicImage, ImageFormat};
use serde::{Deserialize, Serialize};

use super::{
    encode_jpeg,
    file_codecs::{encode_bmp, encode_png, encode_webp},
    flatten_to_rgb,
    profile::resolve_standalone_profile,
    should_keep_original,
    source::with_source_image_bytes,
    CompressionPreset, JpegColor, Raster, AUTOMATIC_LOSSY_QUALITY,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum StandaloneImageOutputMode {
    ConvertToJpeg,
    KeepSourceFormat,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum RasterFileFormat {
    Jpeg,
    Png,
    WebP,
    Bmp,
}

impl RasterFileFormat {
    pub(crate) fn extension(self) -> &'static str {
        match self {
            Self::Jpeg => "jpg",
            Self::Png => "png",
            Self::WebP => "webp",
            Self::Bmp => "bmp",
        }
    }
}

#[derive(Debug)]
pub(crate) struct StandaloneImageRequest<'a> {
    pub source_bytes: &'a [u8],
    pub preset: CompressionPreset,
    pub output_mode: StandaloneImageOutputMode,
    pub jpeg_quality: Option<u8>,
    pub jpeg_background: [u8; 3],
}

#[derive(Debug)]
pub(crate) struct StandaloneImageOutput {
    pub bytes: Vec<u8>,
    pub format: RasterFileFormat,
    pub original_dimensions: (u32, u32),
    pub output_dimensions: (u32, u32),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum UnsupportedImageReason {
    UnsupportedFormat,
    AnimatedWebP,
}

#[derive(Debug)]
pub(crate) enum StandaloneImageResult {
    Compressed(StandaloneImageOutput),
    AlreadyOptimized(StandaloneImageOutput),
    Unsupported { reason: UnsupportedImageReason },
    Failed { message: String },
}

pub(crate) fn compress_standalone_image(
    request: StandaloneImageRequest<'_>,
) -> StandaloneImageResult {
    match compress(request) {
        Ok(result) => result,
        Err(error) => StandaloneImageResult::Failed {
            message: format!("{error:#}"),
        },
    }
}

fn compress(request: StandaloneImageRequest<'_>) -> Result<StandaloneImageResult> {
    let Some(profile) = resolve_standalone_profile(request.preset, request.jpeg_quality) else {
        anyhow::bail!("Original is not a standalone batch compression preset");
    };
    let Some((image_format, source_format)) = detect_supported_format(request.source_bytes)? else {
        return Ok(StandaloneImageResult::Unsupported {
            reason: UnsupportedImageReason::UnsupportedFormat,
        });
    };

    if source_format == RasterFileFormat::WebP {
        let info = webpx::ImageInfo::from_webp(request.source_bytes)
            .map_err(|error| anyhow::anyhow!("failed to inspect WebP: {error}"))?;
        if info.has_animation {
            return Ok(StandaloneImageResult::Unsupported {
                reason: UnsupportedImageReason::AnimatedWebP,
            });
        }
    }

    let output_format = output_format(source_format, request.output_mode);
    with_source_image_bytes(request.source_bytes, image_format, |image, descriptor| {
        let original_dimensions = (descriptor.width, descriptor.height);
        let output_dimensions = profile.target_dimensions(descriptor.width, descriptor.height);
        let raster = prepare_raster(image, output_format, request.jpeg_background)
            .resize(Some(output_dimensions))?;
        let candidate = encode_output(&raster, output_format, profile.jpeg_quality)?;

        let preserves_source_format = output_format == source_format;
        if preserves_source_format
            && should_keep_original(request.source_bytes.len(), candidate.len())
        {
            return Ok(StandaloneImageResult::AlreadyOptimized(
                StandaloneImageOutput {
                    bytes: request.source_bytes.to_vec(),
                    format: source_format,
                    original_dimensions,
                    output_dimensions: original_dimensions,
                },
            ));
        }

        Ok(StandaloneImageResult::Compressed(StandaloneImageOutput {
            bytes: candidate,
            format: output_format,
            original_dimensions,
            output_dimensions,
        }))
    })
}

fn detect_supported_format(bytes: &[u8]) -> Result<Option<(ImageFormat, RasterFileFormat)>> {
    let format = match image::guess_format(bytes) {
        Ok(format) => format,
        Err(image::ImageError::Unsupported(_)) => return Ok(None),
        Err(error) => return Err(error).context("failed to detect image format"),
    };
    Ok(match format {
        ImageFormat::Jpeg => Some((format, RasterFileFormat::Jpeg)),
        ImageFormat::Png => Some((format, RasterFileFormat::Png)),
        ImageFormat::WebP => Some((format, RasterFileFormat::WebP)),
        ImageFormat::Bmp => Some((format, RasterFileFormat::Bmp)),
        _ => None,
    })
}

fn output_format(source: RasterFileFormat, mode: StandaloneImageOutputMode) -> RasterFileFormat {
    match mode {
        StandaloneImageOutputMode::ConvertToJpeg => RasterFileFormat::Jpeg,
        StandaloneImageOutputMode::KeepSourceFormat => source,
    }
}

fn prepare_raster(
    image: DynamicImage,
    output_format: RasterFileFormat,
    jpeg_background: [u8; 3],
) -> Raster {
    match output_format {
        RasterFileFormat::Jpeg => Raster::from_rgb_image(flatten_to_rgb(image, jpeg_background)),
        RasterFileFormat::Png | RasterFileFormat::WebP if image.color().has_alpha() => {
            Raster::from_rgba_image(image.into_rgba8())
        }
        RasterFileFormat::Png | RasterFileFormat::WebP | RasterFileFormat::Bmp => {
            Raster::from_rgb_image(image.into_rgb8())
        }
    }
}

fn encode_output(raster: &Raster, format: RasterFileFormat, quality: u8) -> Result<Vec<u8>> {
    match format {
        RasterFileFormat::Jpeg => encode_jpeg(
            raster.data(),
            raster.width(),
            raster.height(),
            JpegColor::Rgb,
            quality,
        ),
        RasterFileFormat::Png => encode_png(raster),
        RasterFileFormat::WebP => encode_webp(raster, output_quality(format, quality)),
        RasterFileFormat::Bmp => encode_bmp(raster),
    }
}

fn output_quality(format: RasterFileFormat, jpeg_quality: u8) -> u8 {
    match format {
        RasterFileFormat::WebP => AUTOMATIC_LOSSY_QUALITY,
        RasterFileFormat::Jpeg | RasterFileFormat::Png | RasterFileFormat::Bmp => jpeg_quality,
    }
}

#[cfg(test)]
mod tests;
