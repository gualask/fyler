use image::DynamicImage;

use crate::vo::QuarterTurn;

pub(super) fn rotate_dynamic_image(img: DynamicImage, quarter_turn: QuarterTurn) -> DynamicImage {
    match quarter_turn {
        QuarterTurn::Identity => img,
        QuarterTurn::Clockwise90 => img.rotate90(),
        QuarterTurn::HalfTurn => img.rotate180(),
        QuarterTurn::Clockwise270 => img.rotate270(),
    }
}

pub(super) fn rotated_dimensions(
    width_px: u32,
    height_px: u32,
    quarter_turn: QuarterTurn,
) -> (u32, u32) {
    if quarter_turn.swaps_dimensions() {
        (height_px, width_px)
    } else {
        (width_px, height_px)
    }
}
