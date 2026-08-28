use crate::capabilities::pdf::image_embedding::source_image_dimensions;
use crate::modules::sources::{DocKind, SourceLookup};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

use super::contracts::{
    CompositionLayout, CompositionPreviewLayout, CompositionRegions, PreviewLayoutRequest,
    PreviewRegionInput, PreviewSourceKind, QuarterTurn, Rect, RegionPreviewLayout,
};

const POINTS_PER_MM: f64 = 72.0 / 25.4;
const A4_WIDTH_MM: f64 = 210.0;
const A4_HEIGHT_MM: f64 = 297.0;
const OUTER_MARGIN_MM: f64 = 10.0;
const REGION_GAP_MM: f64 = 10.0;
const QUALITY_WARNING_DPI: f64 = 150.0;

const fn mm(value: f64) -> f64 {
    value * POINTS_PER_MM
}

pub(crate) fn page_rect(layout: CompositionLayout) -> Rect {
    let (width_mm, height_mm) = match layout {
        CompositionLayout::A4StackedHalves => (A4_WIDTH_MM, A4_HEIGHT_MM),
        CompositionLayout::A4SideBySideHalves => (A4_HEIGHT_MM, A4_WIDTH_MM),
    };
    Rect {
        x_pt: 0.0,
        y_pt: 0.0,
        width_pt: mm(width_mm),
        height_pt: mm(height_mm),
    }
}

fn region_rects(layout: CompositionLayout) -> CompositionRegions<Rect> {
    let page = page_rect(layout);
    let margin = mm(OUTER_MARGIN_MM);
    let gap = mm(REGION_GAP_MM);
    match layout {
        CompositionLayout::A4StackedHalves => {
            let width = page.width_pt - margin * 2.0;
            let height = (page.height_pt - margin * 2.0 - gap) / 2.0;
            let bottom = Rect {
                x_pt: margin,
                y_pt: margin,
                width_pt: width,
                height_pt: height,
            };
            let top = Rect {
                x_pt: margin,
                y_pt: margin + height + gap,
                width_pt: width,
                height_pt: height,
            };
            CompositionRegions { top, bottom }
        }
        CompositionLayout::A4SideBySideHalves => {
            let width = (page.width_pt - margin * 2.0 - gap) / 2.0;
            let height = page.height_pt - margin * 2.0;
            let top = Rect {
                x_pt: margin,
                y_pt: margin,
                width_pt: width,
                height_pt: height,
            };
            let bottom = Rect {
                x_pt: margin + width + gap,
                y_pt: margin,
                width_pt: width,
                height_pt: height,
            };
            CompositionRegions { top, bottom }
        }
    }
}

fn missing_source_error(file_id: &str) -> anyhow::Error {
    anyhow::Error::new(UserFacingError::with_meta(
        UserFacingErrorCode::SourceNotFound,
        serde_json::json!({ "fileId": file_id }),
    ))
}

fn invalid_source_kind_error(file_id: &str) -> anyhow::Error {
    anyhow::Error::new(UserFacingError::with_meta(
        UserFacingErrorCode::InvalidExportItemKind,
        serde_json::json!({ "fileId": file_id, "expected": "image" }),
    ))
}

fn draw_rect(region: Rect, width_px: u32, height_px: u32, rotation: QuarterTurn) -> (Rect, f64) {
    let (visible_width, visible_height) = if rotation.swaps_dimensions() {
        (f64::from(height_px), f64::from(width_px))
    } else {
        (f64::from(width_px), f64::from(height_px))
    };
    let scale = (region.width_pt / visible_width).min(region.height_pt / visible_height);
    let width_pt = visible_width * scale;
    let height_pt = visible_height * scale;
    let draw = Rect {
        x_pt: region.x_pt + (region.width_pt - width_pt) / 2.0,
        y_pt: region.y_pt + (region.height_pt - height_pt) / 2.0,
        width_pt,
        height_pt,
    };
    let effective_dpi =
        (visible_width / (width_pt / 72.0)).min(visible_height / (height_pt / 72.0));
    (draw, effective_dpi)
}

fn resolve_region<R: SourceLookup>(
    registry: &R,
    region_rect: Rect,
    input: &PreviewRegionInput,
) -> anyhow::Result<RegionPreviewLayout> {
    let Some(input_source) = &input.source else {
        return Ok(RegionPreviewLayout {
            region_rect,
            draw_rect: None,
            rotation: input.rotation,
            clip_rect: None,
            effective_dpi: None,
            quality_warning: false,
        });
    };
    let source = registry
        .get(&input_source.file_id)
        .ok_or_else(|| missing_source_error(&input_source.file_id))?;
    if source.kind != DocKind::Image {
        return Err(invalid_source_kind_error(&input_source.file_id));
    }
    let (width_px, height_px) = source_image_dimensions(&source.original_path)?;
    let (draw, dpi) = draw_rect(region_rect, width_px, height_px, input.rotation);
    let reports_quality = input_source.kind == PreviewSourceKind::Image;
    Ok(RegionPreviewLayout {
        region_rect,
        draw_rect: Some(draw),
        rotation: input.rotation,
        clip_rect: None,
        effective_dpi: reports_quality.then_some(dpi),
        quality_warning: reports_quality && dpi < QUALITY_WARNING_DPI,
    })
}

pub(crate) fn preview_layout<R: SourceLookup>(
    registry: &R,
    request: &PreviewLayoutRequest,
) -> anyhow::Result<CompositionPreviewLayout> {
    let regions = region_rects(request.layout);
    Ok(CompositionPreviewLayout {
        layout: request.layout,
        page_rect: page_rect(request.layout),
        regions: CompositionRegions {
            top: resolve_region(registry, regions.top, &request.regions.top)?,
            bottom: resolve_region(registry, regions.bottom, &request.regions.bottom)?,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::{draw_rect, page_rect, region_rects, CompositionLayout, POINTS_PER_MM};
    use crate::modules::page_composition::QuarterTurn;

    fn close(actual: f64, expected: f64) {
        assert!((actual - expected).abs() < 0.0001, "{actual} != {expected}");
    }

    #[test]
    fn fixed_layout_uses_exact_a4_margins_gap_and_regions() {
        let page = page_rect(CompositionLayout::A4StackedHalves);
        let regions = region_rects(CompositionLayout::A4StackedHalves);
        close(page.width_pt, 210.0 * POINTS_PER_MM);
        close(page.height_pt, 297.0 * POINTS_PER_MM);
        close(regions.top.width_pt, 190.0 * POINTS_PER_MM);
        close(regions.top.height_pt, 133.5 * POINTS_PER_MM);
        close(regions.bottom.y_pt, 10.0 * POINTS_PER_MM);
        close(
            regions.top.y_pt - regions.bottom.y_pt - regions.bottom.height_pt,
            10.0 * POINTS_PER_MM,
        );
    }

    #[test]
    fn horizontal_layout_uses_landscape_a4_and_side_by_side_regions() {
        let page = page_rect(CompositionLayout::A4SideBySideHalves);
        let regions = region_rects(CompositionLayout::A4SideBySideHalves);
        close(page.width_pt, 297.0 * POINTS_PER_MM);
        close(page.height_pt, 210.0 * POINTS_PER_MM);
        close(regions.top.x_pt, 10.0 * POINTS_PER_MM);
        close(regions.top.width_pt, 133.5 * POINTS_PER_MM);
        close(regions.top.height_pt, 190.0 * POINTS_PER_MM);
        close(regions.bottom.x_pt, 153.5 * POINTS_PER_MM);
        close(regions.bottom.width_pt, 133.5 * POINTS_PER_MM);
        close(regions.bottom.height_pt, 190.0 * POINTS_PER_MM);
    }

    #[test]
    fn contain_fit_centers_without_cropping_and_honors_rotation() {
        let region = region_rects(CompositionLayout::A4StackedHalves).top;
        let (landscape, _) = draw_rect(region, 2000, 1000, QuarterTurn::Identity);
        close(landscape.width_pt, region.width_pt);
        assert!(landscape.height_pt < region.height_pt);

        let (portrait, _) = draw_rect(region, 2000, 1000, QuarterTurn::Clockwise90);
        close(portrait.height_pt, region.height_pt);
        assert!(portrait.width_pt < region.width_pt);
    }

    #[test]
    fn quality_threshold_can_distinguish_pixels_around_150_dpi() {
        let region = region_rects(CompositionLayout::A4StackedHalves).top;
        let (_, below) = draw_rect(region, 1122, 788, QuarterTurn::Identity);
        let (_, above) = draw_rect(region, 1123, 790, QuarterTurn::Identity);
        assert!(below < 150.0);
        assert!(above >= 150.0);
    }
}
