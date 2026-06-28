/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    addImageStageChrome,
    fitFixedImageFrame,
    fitImageThumb,
    IMAGE_FRAME_MAX_HEIGHT,
    IMAGE_FRAME_MAX_WIDTH,
    IMAGE_STAGE_CHROME,
} from './image-panel-layout';

test('uses a fixed 4:3 image frame at full available size', () => {
    assert.deepEqual(fitFixedImageFrame(IMAGE_FRAME_MAX_WIDTH, IMAGE_FRAME_MAX_HEIGHT), {
        width: IMAGE_FRAME_MAX_WIDTH,
        height: IMAGE_FRAME_MAX_HEIGHT,
    });
});

test('scales the fixed image frame by panel constraints, not by image ratio', () => {
    assert.deepEqual(fitFixedImageFrame(300, IMAGE_FRAME_MAX_HEIGHT), {
        width: 300,
        height: 225,
    });
    assert.deepEqual(fitFixedImageFrame(IMAGE_FRAME_MAX_WIDTH, 210), {
        width: 280,
        height: 210,
    });
});

test('contains very wide images inside the fixed frame', () => {
    const frame = fitFixedImageFrame(IMAGE_FRAME_MAX_WIDTH, IMAGE_FRAME_MAX_HEIGHT);
    const thumb = fitImageThumb(4096, 128, frame.width, frame.height);

    assert.deepEqual(frame, { width: IMAGE_FRAME_MAX_WIDTH, height: IMAGE_FRAME_MAX_HEIGHT });
    assert.deepEqual(thumb, { width: 560, height: 18 });
});

test('contains very tall images inside the fixed frame', () => {
    const frame = fitFixedImageFrame(IMAGE_FRAME_MAX_WIDTH, IMAGE_FRAME_MAX_HEIGHT);
    const thumb = fitImageThumb(128, 4096, frame.width, frame.height);

    assert.deepEqual(frame, { width: IMAGE_FRAME_MAX_WIDTH, height: IMAGE_FRAME_MAX_HEIGHT });
    assert.deepEqual(thumb, { width: 13, height: 420 });
});

test('contains square images inside the fixed frame', () => {
    const frame = fitFixedImageFrame(IMAGE_FRAME_MAX_WIDTH, IMAGE_FRAME_MAX_HEIGHT);
    const thumb = fitImageThumb(4096, 4096, frame.width, frame.height);

    assert.deepEqual(thumb, { width: 420, height: 420 });
});

test('adds the full border and padding chrome to the outer stage', () => {
    assert.deepEqual(addImageStageChrome({ width: 560, height: 420 }), {
        width: 560 + IMAGE_STAGE_CHROME,
        height: 420 + IMAGE_STAGE_CHROME,
    });
});
