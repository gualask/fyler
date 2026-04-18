import { IconZoomIn, IconZoomOut } from '@tabler/icons-react';

interface Props {
    zoomLevel: number;
    onZoomOut: () => void;
    onZoomIn: () => void;
    onZoomReset: () => void;
    zoomOutTitle: string;
    zoomInTitle: string;
    resetTitle: string;
    resetLabel: string;
}

export function ZoomControls({
    zoomLevel,
    onZoomOut,
    onZoomIn,
    onZoomReset,
    zoomOutTitle,
    zoomInTitle,
    resetTitle,
    resetLabel,
}: Props) {
    return (
        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
            <button
                type="button"
                onClick={onZoomOut}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                title={zoomOutTitle}
            >
                <IconZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center font-mono text-xs font-medium text-white/80">
                {Math.round(zoomLevel * 100)}%
            </span>
            <button
                type="button"
                onClick={onZoomIn}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                title={zoomInTitle}
            >
                <IconZoomIn className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={onZoomReset}
                className="min-h-9 rounded-md px-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
                title={resetTitle}
            >
                {resetLabel}
            </button>
        </div>
    );
}
