use anyhow::{Context, Result};

use super::rotate::rotated_dimensions;

const A4_W: f64 = 595.0;
const A4_H: f64 = 842.0;

#[derive(Debug, Clone, Copy, serde::Serialize)]
/// Parameters used by the frontend to render an accurate export preview for images.
///
/// All measurements are expressed in PDF points (1/72 inch).
pub struct ImageExportPreviewLayout {
    #[serde(rename = "pageWidthPt")]
    pub page_width_pt: f64,
    #[serde(rename = "pageHeightPt")]
    pub page_height_pt: f64,
    #[serde(rename = "drawXPt")]
    pub draw_x_pt: f64,
    #[serde(rename = "drawYPt")]
    pub draw_y_pt: f64,
    #[serde(rename = "drawWidthPt")]
    pub draw_width_pt: f64,
    #[serde(rename = "drawHeightPt")]
    pub draw_height_pt: f64,
    #[serde(rename = "clipToPage")]
    pub clip_to_page: bool,
    #[serde(rename = "fillBackground")]
    pub fill_background: bool,
}

pub(super) fn compute_image_export_layout(
    width_px: u32,
    height_px: u32,
    image_fit: &str,
) -> ImageExportPreviewLayout {
    let w_pt = width_px as f64 * 72.0 / 96.0;
    let h_pt = height_px as f64 * 72.0 / 96.0;

    match image_fit {
        "contain" => {
            let scale = (A4_W / w_pt).min(A4_H / h_pt);
            let sw = w_pt * scale;
            let sh = h_pt * scale;
            ImageExportPreviewLayout {
                page_width_pt: A4_W.ceil(),
                page_height_pt: A4_H.ceil(),
                draw_x_pt: (A4_W - sw) / 2.0,
                draw_y_pt: (A4_H - sh) / 2.0,
                draw_width_pt: sw,
                draw_height_pt: sh,
                clip_to_page: false,
                fill_background: true,
            }
        }
        "cover" => {
            let scale = (A4_W / w_pt).max(A4_H / h_pt);
            let sw = w_pt * scale;
            let sh = h_pt * scale;
            ImageExportPreviewLayout {
                page_width_pt: A4_W.ceil(),
                page_height_pt: A4_H.ceil(),
                draw_x_pt: (A4_W - sw) / 2.0,
                draw_y_pt: (A4_H - sh) / 2.0,
                draw_width_pt: sw,
                draw_height_pt: sh,
                clip_to_page: true,
                fill_background: false,
            }
        }
        _ => ImageExportPreviewLayout {
            page_width_pt: w_pt.ceil(),
            page_height_pt: h_pt.ceil(),
            draw_x_pt: 0.0,
            draw_y_pt: 0.0,
            draw_width_pt: w_pt.ceil(),
            draw_height_pt: h_pt.ceil(),
            clip_to_page: false,
            fill_background: false,
        },
    }
}

/// Computes the export preview layout for an image at `path`.
///
/// The image dimensions are read from disk and adjusted for `quarter_turns` before layout.
pub fn image_export_preview_layout(
    path: &str,
    image_fit: &str,
    quarter_turns: u8,
) -> Result<ImageExportPreviewLayout> {
    let (width_px, height_px) = image::image_dimensions(path).context("Failed to open image")?;
    let (rotated_width_px, rotated_height_px) =
        rotated_dimensions(width_px, height_px, quarter_turns)?;
    Ok(compute_image_export_layout(
        rotated_width_px,
        rotated_height_px,
        image_fit,
    ))
}
