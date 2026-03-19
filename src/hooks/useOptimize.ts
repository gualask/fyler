import { useState } from 'react';

import type { ImageFit, OptimizeOptions } from '@/domain';
import {
    DEFAULT_OPTIMIZATION_PRESET,
    deriveOptimizationPreset,
    getOptimizationSettings,
    type BasicOptimizationPreset,
} from '@/domain/optimizationConfig';

export type { ImageFit };
export type { BasicOptimizationPreset, ImageOptimizationPreset } from '@/domain/optimizationConfig';

export function useOptimize() {
    const defaultSettings = getOptimizationSettings(DEFAULT_OPTIMIZATION_PRESET);
    const [jpegQuality, setJpegQuality] = useState<number | undefined>(defaultSettings.jpegQuality);
    const [targetDpi, setTargetDpi] = useState<number | undefined>(defaultSettings.targetDpi);
    const [imageFit, setImageFit] = useState<ImageFit>('contain');

    const optimizationPreset = deriveOptimizationPreset(jpegQuality, targetDpi);

    const setOptimizationPreset = (preset: BasicOptimizationPreset) => {
        const settings = getOptimizationSettings(preset);
        setJpegQuality(settings.jpegQuality);
        setTargetDpi(settings.targetDpi);
    };

    const optimizeOptions: OptimizeOptions = {
        jpegQuality,
        targetDpi,
        imageFit,
    };

    return {
        imageFit,
        jpegQuality,
        targetDpi,
        optimizationPreset,
        optimizeOptions,
        setImageFit,
        setJpegQuality,
        setTargetDpi,
        setOptimizationPreset,
    };
}
