use crate::capabilities::pdf::composition::PdfComposer;
use crate::capabilities::pdf::image_embedding::{
    ImageEmbeddingOptions, PdfRect, PositionedImage, QuarterTurn as CapabilityQuarterTurn,
};

use super::contracts::{CompositionPreviewLayout, ImageOptimizationOptions, QuarterTurn};

fn capability_rotation(rotation: QuarterTurn) -> CapabilityQuarterTurn {
    match rotation {
        QuarterTurn::Identity => CapabilityQuarterTurn::Identity,
        QuarterTurn::Clockwise90 => CapabilityQuarterTurn::Clockwise90,
        QuarterTurn::HalfTurn => CapabilityQuarterTurn::HalfTurn,
        QuarterTurn::Clockwise270 => CapabilityQuarterTurn::Clockwise270,
    }
}

fn resolve_embedding_options(options: ImageOptimizationOptions) -> ImageEmbeddingOptions {
    let profile = crate::capabilities::raster_compression::resolve_page_profile(
        options.preset,
        options.jpeg_quality,
        options.target_dpi,
    );
    ImageEmbeddingOptions {
        preset: profile.preset,
        jpeg_quality: options.jpeg_quality.or(profile.jpeg_quality),
        target_dpi: profile.target_dpi,
    }
}

pub(super) fn compose_pdf(
    layout: &CompositionPreviewLayout,
    top_path: &str,
    top_rotation: QuarterTurn,
    bottom_path: &str,
    bottom_rotation: QuarterTurn,
    optimization: ImageOptimizationOptions,
) -> anyhow::Result<lopdf::Document> {
    let top_draw = layout
        .regions
        .top
        .draw_rect
        .context("missing front draw rectangle")?;
    let bottom_draw = layout
        .regions
        .bottom
        .draw_rect
        .context("missing back draw rectangle")?;
    let embedding_options = resolve_embedding_options(optimization);
    let images = [
        PositionedImage {
            path: top_path,
            draw_rect: PdfRect {
                x: top_draw.x_pt,
                y: top_draw.y_pt,
                width: top_draw.width_pt,
                height: top_draw.height_pt,
            },
            clip_rect: None,
            rotation: capability_rotation(top_rotation),
            options: Some(&embedding_options),
        },
        PositionedImage {
            path: bottom_path,
            draw_rect: PdfRect {
                x: bottom_draw.x_pt,
                y: bottom_draw.y_pt,
                width: bottom_draw.width_pt,
                height: bottom_draw.height_pt,
            },
            clip_rect: None,
            rotation: capability_rotation(bottom_rotation),
            options: Some(&embedding_options),
        },
    ];
    let mut composer = PdfComposer::new();
    composer.push_positioned_image_page(
        layout.page_rect.width_pt,
        layout.page_rect.height_pt,
        &images,
    )?;
    composer.finish()
}

use anyhow::Context as _;

#[cfg(test)]
mod tests {
    use super::resolve_embedding_options;
    use crate::capabilities::pdf::image_embedding::ImageEmbeddingOptions;
    use crate::capabilities::raster_compression::CompressionPreset;
    use crate::modules::page_composition::contracts::ImageOptimizationOptions;

    #[test]
    fn composition_quality_overrides_preset_quality_but_keeps_target_dpi() {
        assert_eq!(
            resolve_embedding_options(ImageOptimizationOptions {
                preset: Some(CompressionPreset::Light),
                jpeg_quality: Some(85),
                target_dpi: None,
            }),
            ImageEmbeddingOptions {
                preset: Some(CompressionPreset::Light),
                jpeg_quality: Some(85),
                target_dpi: Some(220),
            }
        );
    }
}
