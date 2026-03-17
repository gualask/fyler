use crate::models::OptimizeOptions;

use super::descriptor::{SourceCompressionClass, SourceImageDescriptor};

const ORIGINAL_LOSSY_QUALITY: u8 = 92;
const LIGHT_LOSSY_QUALITY: u8 = 88;
const BALANCED_QUALITY: u8 = 82;
const COMPACT_QUALITY: u8 = 74;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PdfImageEncoding {
    RawRgb,
    Jpeg { quality: u8 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ImageEmbedDecision {
    pub flatten_alpha: bool,
    pub encoding: PdfImageEncoding,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ImagePresetClass {
    Original,
    Light,
    Balanced,
    Compact,
    Custom,
}

pub fn decide_image_embed(
    descriptor: &SourceImageDescriptor,
    opts: Option<&OptimizeOptions>,
) -> ImageEmbedDecision {
    if let Some(quality) = opts.and_then(|value| value.jpeg_quality) {
        return ImageEmbedDecision {
            flatten_alpha: descriptor.has_alpha,
            encoding: PdfImageEncoding::Jpeg {
                quality: quality.clamp(1, 100),
            },
        };
    }

    match preset_class(opts) {
        ImagePresetClass::Original => preserve_source_class(descriptor, ORIGINAL_LOSSY_QUALITY),
        ImagePresetClass::Light => preserve_source_class(descriptor, LIGHT_LOSSY_QUALITY),
        ImagePresetClass::Balanced => ImageEmbedDecision {
            flatten_alpha: descriptor.has_alpha,
            encoding: PdfImageEncoding::Jpeg {
                quality: BALANCED_QUALITY,
            },
        },
        ImagePresetClass::Compact => ImageEmbedDecision {
            flatten_alpha: descriptor.has_alpha,
            encoding: PdfImageEncoding::Jpeg {
                quality: COMPACT_QUALITY,
            },
        },
        ImagePresetClass::Custom => {
            if opts.and_then(|value| value.target_dpi).is_some() {
                let quality = auto_quality_for_target_dpi(opts.and_then(|value| value.target_dpi));
                ImageEmbedDecision {
                    flatten_alpha: descriptor.has_alpha,
                    encoding: PdfImageEncoding::Jpeg { quality },
                }
            } else {
                preserve_source_class(descriptor, LIGHT_LOSSY_QUALITY)
            }
        }
    }
}

fn preserve_source_class(
    descriptor: &SourceImageDescriptor,
    lossy_quality: u8,
) -> ImageEmbedDecision {
    ImageEmbedDecision {
        flatten_alpha: descriptor.has_alpha,
        encoding: match descriptor.compression_class {
            SourceCompressionClass::Lossy => PdfImageEncoding::Jpeg {
                quality: lossy_quality,
            },
            SourceCompressionClass::LosslessOrUnknown => PdfImageEncoding::RawRgb,
        },
    }
}

fn auto_quality_for_target_dpi(target_dpi: Option<u16>) -> u8 {
    match target_dpi {
        Some(dpi) if dpi <= 120 => COMPACT_QUALITY,
        Some(dpi) if dpi <= 170 => BALANCED_QUALITY,
        Some(_) => LIGHT_LOSSY_QUALITY,
        None => LIGHT_LOSSY_QUALITY,
    }
}

fn preset_class(opts: Option<&OptimizeOptions>) -> ImagePresetClass {
    let Some(opts) = opts else {
        return ImagePresetClass::Original;
    };

    if opts.jpeg_quality.is_some() {
        return ImagePresetClass::Custom;
    }

    match opts.target_dpi {
        None => ImagePresetClass::Original,
        Some(dpi) if dpi >= 200 => ImagePresetClass::Light,
        Some(dpi) if dpi >= 145 => ImagePresetClass::Balanced,
        Some(_) => ImagePresetClass::Compact,
    }
}

#[cfg(test)]
mod tests {
    use super::{decide_image_embed, ImageEmbedDecision, PdfImageEncoding};
    use crate::models::OptimizeOptions;
    use crate::pdf_image::descriptor::{SourceCompressionClass, SourceImageDescriptor};

    fn descriptor(
        compression_class: SourceCompressionClass,
        has_alpha: bool,
    ) -> SourceImageDescriptor {
        SourceImageDescriptor {
            compression_class,
            has_alpha,
            width: 1600,
            height: 900,
        }
    }

    #[test]
    fn original_preserves_lossy_class_with_jpeg() {
        assert_eq!(
            decide_image_embed(&descriptor(SourceCompressionClass::Lossy, false), None),
            ImageEmbedDecision {
                flatten_alpha: false,
                encoding: PdfImageEncoding::Jpeg { quality: 92 },
            }
        );
    }

    #[test]
    fn original_preserves_lossless_class_with_raw() {
        assert_eq!(
            decide_image_embed(
                &descriptor(SourceCompressionClass::LosslessOrUnknown, false),
                None
            ),
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
                &descriptor(SourceCompressionClass::LosslessOrUnknown, false),
                Some(&OptimizeOptions {
                    jpeg_quality: None,
                    target_dpi: Some(220),
                    image_fit: None,
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
                &descriptor(SourceCompressionClass::LosslessOrUnknown, true),
                Some(&OptimizeOptions {
                    jpeg_quality: None,
                    target_dpi: Some(170),
                    image_fit: None,
                }),
            ),
            ImageEmbedDecision {
                flatten_alpha: true,
                encoding: PdfImageEncoding::Jpeg { quality: 82 },
            }
        );
    }

    #[test]
    fn manual_quality_overrides_preset() {
        assert_eq!(
            decide_image_embed(
                &descriptor(SourceCompressionClass::LosslessOrUnknown, true),
                Some(&OptimizeOptions {
                    jpeg_quality: Some(77),
                    target_dpi: Some(220),
                    image_fit: None,
                }),
            ),
            ImageEmbedDecision {
                flatten_alpha: true,
                encoding: PdfImageEncoding::Jpeg { quality: 77 },
            }
        );
    }
}
