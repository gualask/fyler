import type { ImageFit } from '@/shared/domain';
import type {
    BasicOptimizationPreset,
    ImageOptimizationPreset,
} from '@/shared/domain/optimization-config';

export type OptimizeState = {
    imageFit: ImageFit;
    jpegQuality?: number;
    targetDpi?: number;
    optimizationPreset: ImageOptimizationPreset;
    setImageFit: (v: ImageFit) => void;
    setJpegQuality: (v: number | undefined) => void;
    setTargetDpi: (v: number | undefined) => void;
    setOptimizationPreset: (v: BasicOptimizationPreset) => void;
};
