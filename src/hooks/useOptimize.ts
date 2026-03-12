import { useState } from 'react';

import type { ImageFit, OptimizeOptions } from '../domain';
import {
    deriveOptimizationPreset,
    getOptimizationSettings,
    type BasicOptimizationPreset,
} from '../optimizationConfig';

export type { ImageFit };
export type { BasicOptimizationPreset, ImageOptimizationPreset } from '../optimizationConfig';

export function useOptimize() {
    const [jpegQuality, setJpegQuality] = useState<number | undefined>(undefined);
    const [maxPx, setMaxPx] = useState<number | undefined>(undefined);
    const [imageFit, setImageFit] = useState<ImageFit>('contain');

    const optimizationPreset = deriveOptimizationPreset(jpegQuality, maxPx);

    const setOptimizationPreset = (preset: BasicOptimizationPreset) => {
        const settings = getOptimizationSettings(preset);
        setJpegQuality(settings.jpegQuality);
        setMaxPx(settings.maxPx);
    };

    const optimizeOptions: OptimizeOptions = {
        jpegQuality,
        maxPx,
        imageFit,
    };

    return {
        imageFit,
        jpegQuality,
        maxPx,
        optimizationPreset,
        optimizeOptions,
        setImageFit,
        setJpegQuality,
        setMaxPx,
        setOptimizationPreset,
    };
}
