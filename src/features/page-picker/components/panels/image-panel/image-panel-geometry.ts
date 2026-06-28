import {
    addImageStageChrome,
    fitFixedImageFrame,
    fitImageThumb,
    IMAGE_FRAME_MAX_HEIGHT,
    IMAGE_FRAME_MAX_WIDTH,
    IMAGE_STAGE_CHROME,
    type ImagePanelSize,
} from './image-panel-layout';

const IMAGE_THUMB_FALLBACK_WIDTH = 420;
const IMAGE_THUMB_FALLBACK_HEIGHT = 320;
const IMAGE_ACTION_TOOLBAR_HEIGHT = 48;
const IMAGE_ACTION_TOOLBAR_GAP = 8;

export type ImageNaturalSize = {
    width: number;
    height: number;
};

export type ImagePanelGeometry = {
    outerFrameSize: ImagePanelSize;
    stageSize: ImagePanelSize;
};

function imageMaxFrameSize(imageStageSize: ImagePanelSize): ImagePanelSize {
    return {
        width:
            imageStageSize.width > 0
                ? Math.min(
                      Math.max(imageStageSize.width - IMAGE_STAGE_CHROME, 1),
                      IMAGE_FRAME_MAX_WIDTH,
                  )
                : IMAGE_FRAME_MAX_WIDTH,
        height:
            imageStageSize.height > 0
                ? Math.min(
                      Math.max(
                          imageStageSize.height -
                              IMAGE_STAGE_CHROME -
                              IMAGE_ACTION_TOOLBAR_HEIGHT -
                              IMAGE_ACTION_TOOLBAR_GAP,
                          1,
                      ),
                      IMAGE_FRAME_MAX_HEIGHT,
                  )
                : IMAGE_FRAME_MAX_HEIGHT,
    };
}

function naturalImageSize(imageNaturalSize: ImageNaturalSize | null): ImagePanelSize {
    return {
        width: imageNaturalSize?.width ?? IMAGE_THUMB_FALLBACK_WIDTH,
        height: imageNaturalSize?.height ?? IMAGE_THUMB_FALLBACK_HEIGHT,
    };
}

function rotatedImageSize(size: ImagePanelSize, quarterTurns: number): ImagePanelSize {
    return quarterTurns % 2 === 1 ? { width: size.height, height: size.width } : size;
}

export function imagePanelGeometry(
    imageStageSize: ImagePanelSize,
    imageNaturalSize: ImageNaturalSize | null,
    quarterTurns: number,
): ImagePanelGeometry {
    const maxFrameSize = imageMaxFrameSize(imageStageSize);
    const frameSize = fitFixedImageFrame(maxFrameSize.width, maxFrameSize.height);
    const rotatedSize = rotatedImageSize(naturalImageSize(imageNaturalSize), quarterTurns);
    const thumbSize = fitImageThumb(
        rotatedSize.width,
        rotatedSize.height,
        frameSize.width,
        frameSize.height,
    );

    return {
        outerFrameSize: addImageStageChrome(frameSize),
        stageSize: rotatedImageSize(thumbSize, quarterTurns),
    };
}
