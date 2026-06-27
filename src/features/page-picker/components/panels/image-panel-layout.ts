export interface ImagePanelSize {
    width: number;
    height: number;
}

const IMAGE_STAGE_BORDER = 2;
const IMAGE_STAGE_PADDING = 8;

export const IMAGE_FRAME_MAX_WIDTH = 560;
export const IMAGE_FRAME_MAX_HEIGHT = 420;
export const IMAGE_STAGE_CHROME = (IMAGE_STAGE_BORDER + IMAGE_STAGE_PADDING) * 2;

export function fitFixedImageFrame(maxWidth: number, maxHeight: number): ImagePanelSize {
    if (maxWidth <= 0 || maxHeight <= 0) {
        return { width: IMAGE_FRAME_MAX_WIDTH, height: IMAGE_FRAME_MAX_HEIGHT };
    }

    const scale = Math.min(maxWidth / IMAGE_FRAME_MAX_WIDTH, maxHeight / IMAGE_FRAME_MAX_HEIGHT);
    return {
        width: Math.max(1, Math.round(IMAGE_FRAME_MAX_WIDTH * scale)),
        height: Math.max(1, Math.round(IMAGE_FRAME_MAX_HEIGHT * scale)),
    };
}

export function fitImageThumb(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number,
): ImagePanelSize {
    if (width <= 0 || height <= 0) {
        return { width: maxWidth, height: maxHeight };
    }

    const scale = Math.min(maxWidth / width, maxHeight / height);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

export function addImageStageChrome(size: ImagePanelSize): ImagePanelSize {
    return {
        width: size.width + IMAGE_STAGE_CHROME,
        height: size.height + IMAGE_STAGE_CHROME,
    };
}
