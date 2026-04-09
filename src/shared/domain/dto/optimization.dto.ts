export type BasicOptimizationPreset = 'original' | 'light' | 'balanced' | 'compact';
export type ImageOptimizationPreset = BasicOptimizationPreset | 'custom';

export type OptimizationSettings = {
    jpegQuality?: number;
    targetDpi?: number;
};
