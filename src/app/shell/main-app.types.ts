import type { ImageFit, ImageOptimizationPreset } from '@/shared/domain';

export type OptimizeState = {
    imageFit: ImageFit;
    jpegQuality?: number;
    targetDpi?: number;
    optimizationPreset: ImageOptimizationPreset;
    setImageFit: (v: ImageFit) => void;
    setJpegQuality: (v: number | undefined) => void;
    setTargetDpi: (v: number | undefined) => void;
    setOptimizationPreset: (v: ImageOptimizationPreset) => void;
};
