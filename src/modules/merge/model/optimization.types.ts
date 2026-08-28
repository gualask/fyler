import type { BasicCompressionPreset } from '@/capabilities/compression-profiles';

export type BasicOptimizationPreset = BasicCompressionPreset;
export type ImageOptimizationPreset = BasicCompressionPreset | 'custom';
