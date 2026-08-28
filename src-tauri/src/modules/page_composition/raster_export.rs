use image::{imageops::FilterType, DynamicImage, RgbImage};

use crate::capabilities::raster_compression::{
    encode_jpeg, flatten_to_white_rgb, resolve_page_profile, validate_raster_layout,
    with_source_image, JpegColor, AUTOMATIC_LOSSY_QUALITY,
};

use super::contracts::{CompositionPreviewLayout, ImageOptimizationOptions, QuarterTurn, Rect};

const DEFAULT_COMPOSITION_DPI: u16 = 220;

fn rotate(image: DynamicImage, rotation: QuarterTurn) -> DynamicImage {
    match rotation {
        QuarterTurn::Identity => image,
        QuarterTurn::Clockwise90 => image.rotate90(),
        QuarterTurn::HalfTurn => image.rotate180(),
        QuarterTurn::Clockwise270 => image.rotate270(),
    }
}

fn canvas_dimensions(page: Rect, dpi: u16) -> anyhow::Result<(u32, u32)> {
    let scale = f64::from(dpi) / 72.0;
    let width = (page.width_pt * scale).round() as u32;
    let height = (page.height_pt * scale).round() as u32;
    validate_raster_layout(width, height, 3)?;
    anyhow::ensure!(
        width <= u32::from(u16::MAX) && height <= u32::from(u16::MAX),
        "JPEG canvas exceeds encoder dimensions"
    );
    Ok((width, height))
}

fn raster_rect(page: Rect, draw: Rect, dpi: u16) -> anyhow::Result<(u32, u32, u32, u32)> {
    let scale = f64::from(dpi) / 72.0;
    let left = (draw.x_pt * scale).round() as i64;
    let right = ((draw.x_pt + draw.width_pt) * scale).round() as i64;
    let top = ((page.height_pt - draw.y_pt - draw.height_pt) * scale).round() as i64;
    let bottom = ((page.height_pt - draw.y_pt) * scale).round() as i64;
    anyhow::ensure!(
        left >= 0 && top >= 0 && right > left && bottom > top,
        "invalid raster draw rectangle"
    );
    Ok((
        left as u32,
        top as u32,
        (right - left) as u32,
        (bottom - top) as u32,
    ))
}

fn place_image(
    canvas: &mut RgbImage,
    path: &str,
    rotation: QuarterTurn,
    target: (u32, u32, u32, u32),
) -> anyhow::Result<()> {
    let (x, y, width, height) = target;
    anyhow::ensure!(
        x.saturating_add(width) <= canvas.width() && y.saturating_add(height) <= canvas.height(),
        "image placement exceeds JPEG canvas"
    );
    with_source_image(path, |image, _descriptor| {
        let source = flatten_to_white_rgb(rotate(image, rotation));
        let resized = image::imageops::resize(&source, width, height, FilterType::Lanczos3);
        image::imageops::replace(canvas, &resized, i64::from(x), i64::from(y));
        Ok(())
    })
}

pub(super) fn compose_jpeg(
    layout: &CompositionPreviewLayout,
    top_path: &str,
    top_rotation: QuarterTurn,
    bottom_path: &str,
    bottom_rotation: QuarterTurn,
    optimization: ImageOptimizationOptions,
) -> anyhow::Result<Vec<u8>> {
    let profile = resolve_page_profile(
        optimization.preset,
        optimization.jpeg_quality,
        optimization.target_dpi,
    );
    let dpi = profile.target_dpi.unwrap_or(DEFAULT_COMPOSITION_DPI);
    let quality = optimization
        .jpeg_quality
        .or(profile.jpeg_quality)
        .unwrap_or(AUTOMATIC_LOSSY_QUALITY)
        .clamp(1, 100);
    let (width, height) = canvas_dimensions(layout.page_rect, dpi)?;
    let mut canvas = RgbImage::from_pixel(width, height, image::Rgb([255, 255, 255]));

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
    place_image(
        &mut canvas,
        top_path,
        top_rotation,
        raster_rect(layout.page_rect, top_draw, dpi)?,
    )?;
    place_image(
        &mut canvas,
        bottom_path,
        bottom_rotation,
        raster_rect(layout.page_rect, bottom_draw, dpi)?,
    )?;

    encode_jpeg(canvas.as_raw(), width, height, JpegColor::Rgb, quality)
}

use anyhow::Context as _;

#[cfg(test)]
mod tests {
    use super::{canvas_dimensions, raster_rect};
    use crate::modules::page_composition::contracts::Rect;

    #[test]
    fn portrait_a4_uses_the_requested_dpi() -> anyhow::Result<()> {
        let page = Rect {
            x_pt: 0.0,
            y_pt: 0.0,
            width_pt: 210.0 * 72.0 / 25.4,
            height_pt: 297.0 * 72.0 / 25.4,
        };
        assert_eq!(canvas_dimensions(page, 220)?, (1819, 2572));
        Ok(())
    }

    #[test]
    fn pdf_bottom_left_rect_maps_to_raster_top_left_coordinates() -> anyhow::Result<()> {
        let page = Rect {
            x_pt: 0.0,
            y_pt: 0.0,
            width_pt: 600.0,
            height_pt: 800.0,
        };
        let draw = Rect {
            x_pt: 100.0,
            y_pt: 500.0,
            width_pt: 200.0,
            height_pt: 100.0,
        };
        assert_eq!(raster_rect(page, draw, 72)?, (100, 200, 200, 100));
        Ok(())
    }
}
