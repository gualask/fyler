import { useState } from 'react';

import type { ImageFit, OptimizeOptions } from '@/shared/domain';
import {
    DEFAULT_OPTIMIZATION_PRESET,
    getOptimizationSettings,
    type ImageOptimizationPreset,
} from '@/shared/domain/optimization-config';

export type { BasicOptimizationPreset } from '@/shared/domain/optimization-config';
export type { ImageFit };

export function useOptimize() {
    const defaultSettings = getOptimizationSettings(DEFAULT_OPTIMIZATION_PRESET);
    const [jpegQuality, setJpegQuality] = useState<number | undefined>(defaultSettings.jpegQuality);
    const [targetDpi, setTargetDpi] = useState<number | undefined>(defaultSettings.targetDpi);
    const [imageFit, setImageFit] = useState<ImageFit>('contain');
    const [optimizationPreset, setOptimizationPresetState] = useState<ImageOptimizationPreset>(
        DEFAULT_OPTIMIZATION_PRESET,
    );

    const setOptimizationPreset = (preset: ImageOptimizationPreset) => {
        if (preset === 'custom') {
            setOptimizationPresetState('custom');
            return;
        }

        const settings = getOptimizationSettings(preset);
        setJpegQuality(settings.jpegQuality);
        setTargetDpi(settings.targetDpi);
        setOptimizationPresetState(preset);
    };

    const setCustomJpegQuality = (value: number | undefined) => {
        setJpegQuality(value);
        setOptimizationPresetState('custom');
    };

    const setCustomTargetDpi = (value: number | undefined) => {
        setTargetDpi(value);
        setOptimizationPresetState('custom');
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
        setJpegQuality: setCustomJpegQuality,
        setTargetDpi: setCustomTargetDpi,
        setOptimizationPreset,
    };
}
