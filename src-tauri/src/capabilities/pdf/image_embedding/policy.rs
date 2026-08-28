use super::ImageEmbeddingOptions;

use crate::capabilities::raster_compression::{
    CompressionPreset, SourceImageDescriptor, SourceImageFormat, AUTOMATIC_LOSSY_QUALITY,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Output encoding used when embedding an image into the exported PDF.
pub enum PdfImageEncoding {
    /// Embed raw RGB bytes (largest, but lossless for already-lossless sources).
    RawRgb,
    /// Encode to JPEG at the specified quality.
    Jpeg { quality: u8 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Decision produced by the policy layer about how to embed an image.
pub struct ImageEmbedDecision {
    /// Whether alpha should be flattened against a white background.
    pub flatten_alpha: bool,
    pub encoding: PdfImageEncoding,
}

/// Chooses how a source image should be embedded into the output PDF.
///
/// The policy aims to preserve fidelity while enabling size reductions when the user requests
/// optimization. Lossless sources are kept raw unless a JPEG re-encode is explicitly requested.
pub fn decide_image_embed(
    descriptor: &SourceImageDescriptor,
    opts: Option<&ImageEmbeddingOptions>,
) -> ImageEmbedDecision {
    if opts.and_then(|value| value.preset).is_none() {
        if let Some(quality) = opts.and_then(|value| value.jpeg_quality) {
            return ImageEmbedDecision {
                flatten_alpha: descriptor.has_alpha,
                encoding: PdfImageEncoding::Jpeg {
                    quality: quality.clamp(1, 100),
                },
            };
        }
    }

    let requested_quality = opts
        .and_then(|value| value.jpeg_quality)
        .unwrap_or(AUTOMATIC_LOSSY_QUALITY)
        .clamp(1, 100);

    match opts.and_then(|value| value.preset) {
        Some(CompressionPreset::Original) => preserve_source_class(descriptor),
        Some(CompressionPreset::Light) => {
            preserve_source_class_with_quality(descriptor, requested_quality)
        }
        Some(CompressionPreset::Balanced | CompressionPreset::Compact) => ImageEmbedDecision {
            flatten_alpha: descriptor.has_alpha,
            encoding: PdfImageEncoding::Jpeg {
                quality: requested_quality,
            },
        },
        None if opts.and_then(|value| value.target_dpi).is_some() => ImageEmbedDecision {
            flatten_alpha: descriptor.has_alpha,
            encoding: PdfImageEncoding::Jpeg {
                quality: AUTOMATIC_LOSSY_QUALITY,
            },
        },
        None => preserve_source_class(descriptor),
    }
}

fn preserve_source_class(descriptor: &SourceImageDescriptor) -> ImageEmbedDecision {
    preserve_source_class_with_quality(descriptor, AUTOMATIC_LOSSY_QUALITY)
}

fn preserve_source_class_with_quality(
    descriptor: &SourceImageDescriptor,
    jpeg_quality: u8,
) -> ImageEmbedDecision {
    ImageEmbedDecision {
        flatten_alpha: descriptor.has_alpha,
        encoding: match descriptor.format {
            SourceImageFormat::Jpeg | SourceImageFormat::WebP => PdfImageEncoding::Jpeg {
                quality: jpeg_quality,
            },
            SourceImageFormat::Png | SourceImageFormat::Bmp | SourceImageFormat::Other => {
                PdfImageEncoding::RawRgb
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use super::{decide_image_embed, ImageEmbedDecision, PdfImageEncoding};
    use crate::capabilities::pdf::image_embedding::ImageEmbeddingOptions;
    use crate::capabilities::raster_compression::{
        CompressionPreset, SourceImageDescriptor, SourceImageFormat,
    };

    fn descriptor(format: SourceImageFormat, has_alpha: bool) -> SourceImageDescriptor {
        SourceImageDescriptor {
            format,
            has_alpha,
            width: 1600,
            height: 900,
        }
    }

    #[test]
    fn original_preserves_lossy_class_with_jpeg() {
        assert_eq!(
            decide_image_embed(&descriptor(SourceImageFormat::Jpeg, false), None),
            ImageEmbedDecision {
                flatten_alpha: false,
                encoding: PdfImageEncoding::Jpeg { quality: 92 },
            }
        );
    }

    #[test]
    fn original_preserves_lossless_class_with_raw() {
        assert_eq!(
            decide_image_embed(&descriptor(SourceImageFormat::Png, false), None),
            ImageEmbedDecision {
                flatten_alpha: false,
                encoding: PdfImageEncoding::RawRgb,
            }
        );
    }

    #[test]
    fn light_keeps_lossless_sources_raw() {
        assert_eq!(
            decide_image_embed(
                &descriptor(SourceImageFormat::Png, false),
                Some(&ImageEmbeddingOptions {
                    preset: Some(CompressionPreset::Light),
                    jpeg_quality: None,
                    target_dpi: Some(220),
                }),
            ),
            ImageEmbedDecision {
                flatten_alpha: false,
                encoding: PdfImageEncoding::RawRgb,
            }
        );
    }

    #[test]
    fn balanced_flattens_alpha_and_uses_jpeg() {
        assert_eq!(
            decide_image_embed(
                &descriptor(SourceImageFormat::Png, true),
                Some(&ImageEmbeddingOptions {
                    preset: Some(CompressionPreset::Balanced),
                    jpeg_quality: None,
                    target_dpi: Some(170),
                }),
            ),
            ImageEmbedDecision {
                flatten_alpha: true,
                encoding: PdfImageEncoding::Jpeg { quality: 92 },
            }
        );
    }

    #[test]
    fn manual_quality_overrides_preset() {
        assert_eq!(
            decide_image_embed(
                &descriptor(SourceImageFormat::Png, true),
                Some(&ImageEmbeddingOptions {
                    preset: None,
                    jpeg_quality: Some(77),
                    target_dpi: Some(220),
                }),
            ),
            ImageEmbedDecision {
                flatten_alpha: true,
                encoding: PdfImageEncoding::Jpeg { quality: 77 },
            }
        );
    }

    #[test]
    fn manual_quality_overrides_named_preset_without_changing_light_source_class() {
        assert_eq!(
            decide_image_embed(
                &descriptor(SourceImageFormat::Jpeg, false),
                Some(&ImageEmbeddingOptions {
                    preset: Some(CompressionPreset::Light),
                    jpeg_quality: Some(85),
                    target_dpi: Some(220),
                }),
            ),
            ImageEmbedDecision {
                flatten_alpha: false,
                encoding: PdfImageEncoding::Jpeg { quality: 85 },
            }
        );
        assert_eq!(
            decide_image_embed(
                &descriptor(SourceImageFormat::Png, false),
                Some(&ImageEmbeddingOptions {
                    preset: Some(CompressionPreset::Light),
                    jpeg_quality: Some(85),
                    target_dpi: Some(220),
                }),
            ),
            ImageEmbedDecision {
                flatten_alpha: false,
                encoding: PdfImageEncoding::RawRgb,
            }
        );
    }
}
