import { useCallback, useMemo, useState } from 'react';
import type { ImageFit, ImageOptimizationPreset } from '@/modules/merge/model';
import { DEFAULT_OPTIMIZATION_PRESET, getOptimizationSettings } from '@/modules/merge/model';
import type { OptimizeState } from '@/modules/merge/ui/workspace/main-app.types';

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
