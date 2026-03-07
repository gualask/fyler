import { useState } from 'react';
import type { ImageFit, OptimizeOptions } from '../domain';

export type CompressionLevel = 'none' | 'medium' | 'high';
export type ResizeLevel = 'original' | '2000' | '1500';
export type { ImageFit };

export function useOptimize() {
    const [compression, setCompression] = useState<CompressionLevel>('none');
    const [resize, setResize] = useState<ResizeLevel>('original');
    const [imageFit, setImageFit] = useState<ImageFit>('fit');

    const optimizeOptions: OptimizeOptions = {
        jpegQuality:
            compression === 'high' ? 'low' : compression === 'medium' ? 'medium' : undefined,
        maxPx: resize === '2000' ? 2000 : resize === '1500' ? 1500 : undefined,
        imageFit,
    };

    return { compression, resize, imageFit, setCompression, setResize, setImageFit, optimizeOptions };
}
