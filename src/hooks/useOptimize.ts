import { useState } from 'react';
import type { JpegQuality, OptimizeOptions } from '../domain';

export function useOptimize() {
    const [jpegEnabled, setJpegEnabled] = useState(false);
    const [jpegQuality, setJpegQuality] = useState<JpegQuality>('high');
    const [resizeEnabled, setResizeEnabled] = useState(false);
    const [maxPx, setMaxPx] = useState(1920);

    const optimizeOptions: OptimizeOptions | undefined =
        jpegEnabled || resizeEnabled
            ? {
                  jpegQuality: jpegEnabled ? jpegQuality : undefined,
                  maxPx: resizeEnabled ? maxPx : undefined,
              }
            : undefined;

    const popoverProps = {
        jpegEnabled,  onJpegEnabled: setJpegEnabled,
        jpegQuality,  onJpegQuality: setJpegQuality,
        resizeEnabled, onResizeEnabled: setResizeEnabled,
        maxPx,        onMaxPx: setMaxPx,
    };

    return { optimizeOptions, popoverProps };
}
