import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline';

interface Props {
    onPreview?: () => void;
    onRotateLeft?: () => void;
    onRotateRight?: () => void;
    disabled?: boolean;
    compact?: boolean;
}

export function PageQuickActions({
    onPreview,
    onRotateLeft,
    onRotateRight,
    disabled = false,
    compact = false,
}: Props) {
    const previewSize = compact ? 'h-7 w-7' : 'h-8 w-8';
    const rotateSize = compact ? 'h-6 w-6' : 'h-7 w-7';
    const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

    return (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />

            {onPreview && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview();
                        }}
                        disabled={disabled}
                        className={`flex ${previewSize} items-center justify-center rounded-full bg-slate-800/80 text-white shadow-lg transition-colors hover:bg-slate-900 disabled:cursor-wait disabled:opacity-40`}
                    >
                        <MagnifyingGlassPlusIcon className={iconSize} />
                    </button>
                </div>
            )}

            {(onRotateLeft || onRotateRight) && (
                <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1">
                    {onRotateLeft && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRotateLeft();
                            }}
                            disabled={disabled}
                            className={`flex ${rotateSize} items-center justify-center rounded-full bg-white/85 text-slate-800 shadow-md transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-40`}
                            title="Ruota 90° antiorario"
                        >
                            <ArrowUturnLeftIcon className={iconSize} />
                        </button>
                    )}
                    {onRotateRight && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRotateRight();
                            }}
                            disabled={disabled}
                            className={`flex ${rotateSize} items-center justify-center rounded-full bg-white/85 text-slate-800 shadow-md transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-40`}
                            title="Ruota 90° orario"
                        >
                            <ArrowUturnRightIcon className={iconSize} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
