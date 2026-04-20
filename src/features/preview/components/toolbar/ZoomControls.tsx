import { IconZoomIn, IconZoomOut } from '@tabler/icons-react';
import {
    toolbarIconButtonClassName,
    toolbarPanelClassName,
    toolbarTextButtonClassName,
    toolbarValueClassName,
} from './toolbar.styles';

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
        <div className={`${toolbarPanelClassName} gap-0.5 px-1`}>
            <button
                type="button"
                onClick={onZoomOut}
                className={toolbarIconButtonClassName}
                title={zoomOutTitle}
                aria-label={zoomOutTitle}
            >
                <IconZoomOut className="h-4 w-4" />
            </button>
            <span className={toolbarValueClassName}>{Math.round(zoomLevel * 100)}%</span>
            <button
                type="button"
                onClick={onZoomIn}
                className={toolbarIconButtonClassName}
                title={zoomInTitle}
                aria-label={zoomInTitle}
            >
                <IconZoomIn className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={onZoomReset}
                className={toolbarTextButtonClassName}
                title={resetTitle}
                aria-label={resetTitle}
            >
                {resetLabel}
            </button>
        </div>
    );
}
