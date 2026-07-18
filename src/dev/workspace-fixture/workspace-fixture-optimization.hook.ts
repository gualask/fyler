import { useCallback, useMemo, useState } from 'react';
import type { OptimizeState } from '@/app/shell/main-app.types';
import type { ImageOptimizationPreset } from '@/features/export/optimization.types';
import {
    DEFAULT_OPTIMIZATION_PRESET,
    getOptimizationSettings,
} from '@/features/export/optimization-presets';
import type { ImageFit } from '@/shared/domain';

export function useWorkspaceFixtureOptimization(): OptimizeState {
    const [imageFit, setImageFit] = useState<ImageFit>('contain');
    const defaultOptimization = getOptimizationSettings(DEFAULT_OPTIMIZATION_PRESET);
    const [jpegQuality, setJpegQuality] = useState<number | undefined>(
        defaultOptimization.jpegQuality,
    );
    const [targetDpi, setTargetDpi] = useState<number | undefined>(defaultOptimization.targetDpi);
    const [optimizationPreset, setOptimizationPresetState] = useState<ImageOptimizationPreset>(
        DEFAULT_OPTIMIZATION_PRESET,
    );

    const setOptimizationPreset = useCallback((preset: ImageOptimizationPreset) => {
        if (preset === 'custom') {
            setOptimizationPresetState('custom');
            return;
        }

        const settings = getOptimizationSettings(preset);
        setOptimizationPresetState(preset);
        setJpegQuality(settings.jpegQuality);
        setTargetDpi(settings.targetDpi);
    }, []);

    return useMemo(
        () => ({
            imageFit,
            jpegQuality,
            targetDpi,
            optimizationPreset,
            setImageFit,
            setJpegQuality: (value) => {
                setJpegQuality(value);
                setOptimizationPresetState('custom');
            },
            setTargetDpi: (value) => {
                setTargetDpi(value);
                setOptimizationPresetState('custom');
            },
            setOptimizationPreset,
        }),
        [imageFit, jpegQuality, optimizationPreset, setOptimizationPreset, targetDpi],
    );
}
