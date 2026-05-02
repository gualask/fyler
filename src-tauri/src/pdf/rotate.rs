use anyhow::Result;
use image::DynamicImage;

use crate::error::UserFacingError;

/// Converts quarter-turns (`0..=3`) into degrees (`0/90/180/270`).
///
/// Returns a user-facing error for invalid values.
pub fn quarter_turns_to_degrees(turns: u8) -> Result<i32> {
    match turns {
        0..=3 => Ok(i32::from(turns) * 90),
        other => Err(anyhow::Error::new(UserFacingError::with_meta(
            "invalid_rotation",
            serde_json::json!({ "value": other }),
        ))),
    }
}

/// Validates that `turns` is in the range `0..=3`.
///
/// Returns a user-facing error for invalid values.
pub fn validate_quarter_turns(turns: u8) -> Result<()> {
    quarter_turns_to_degrees(turns).map(|_| ())
}

pub(super) fn rotate_dynamic_image(img: DynamicImage, quarter_turns: u8) -> Result<DynamicImage> {
    Ok(match quarter_turns_to_degrees(quarter_turns)? {
        0 => img,
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => unreachable!(),
    })
}

pub(super) fn rotated_dimensions(
    width_px: u32,
    height_px: u32,
    quarter_turns: u8,
) -> Result<(u32, u32)> {
    Ok(match quarter_turns_to_degrees(quarter_turns)? {
        0 | 180 => (width_px, height_px),
        90 | 270 => (height_px, width_px),
        _ => unreachable!(),
    })
}
