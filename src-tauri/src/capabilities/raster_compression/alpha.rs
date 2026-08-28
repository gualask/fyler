use image::{DynamicImage, RgbImage, RgbaImage};

/// Flattens an image against white and returns eight-bit RGB pixels.
pub(crate) fn flatten_to_white_rgb(img: DynamicImage) -> RgbImage {
    flatten_to_rgb(img, [255, 255, 255])
}

/// Flattens an image against the requested opaque background.
pub(crate) fn flatten_to_rgb(img: DynamicImage, background: [u8; 3]) -> RgbImage {
    if !img.color().has_alpha() {
        return img.into_rgb8();
    }

    let rgba: RgbaImage = img.into_rgba8();
    let (width, height) = rgba.dimensions();
    let mut rgb = RgbImage::new(width, height);

    for (x, y, pixel) in rgba.enumerate_pixels() {
        let alpha = f32::from(pixel[3]) / 255.0;
        let blend = |channel: u8, background: u8| -> u8 {
            let value = f32::from(channel) * alpha + f32::from(background) * (1.0 - alpha);
            value.round().clamp(0.0, 255.0) as u8
        };
        rgb.put_pixel(
            x,
            y,
            image::Rgb([
                blend(pixel[0], background[0]),
                blend(pixel[1], background[1]),
                blend(pixel[2], background[2]),
            ]),
        );
    }

    rgb
}

#[cfg(test)]
mod tests {
    use image::{DynamicImage, RgbaImage};

    use super::{flatten_to_rgb, flatten_to_white_rgb};

    #[test]
    fn half_transparent_pixels_are_composited_over_white() {
        let image =
            DynamicImage::ImageRgba8(RgbaImage::from_pixel(1, 1, image::Rgba([0, 64, 255, 128])));

        let flattened = flatten_to_white_rgb(image);

        assert_eq!(flattened.get_pixel(0, 0).0, [127, 159, 255]);
    }

    #[test]
    fn transparent_pixels_use_the_requested_background() {
        let image =
            DynamicImage::ImageRgba8(RgbaImage::from_pixel(1, 1, image::Rgba([255, 0, 0, 0])));

        let flattened = flatten_to_rgb(image, [12, 34, 56]);

        assert_eq!(flattened.get_pixel(0, 0).0, [12, 34, 56]);
    }
}
