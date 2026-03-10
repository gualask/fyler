import { useCallback, useState } from 'react';
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    ChevronDownIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

import type { RotationDirection } from '../../../fileEdits';
import type { MoveControl } from '../types';

interface Props {
    displayCurrentPage: number;
    displayTotalPages: number;
    zoomLevel: number;
    canRotate: boolean;
    isRotating: boolean;
    moveControl?: MoveControl;
    onZoomOut: () => void;
    onZoomIn: () => void;
    onZoomReset: () => void;
    onRotate: (direction: RotationDirection) => void;
    onClose: () => void;
}

export function Toolbar({
    displayCurrentPage,
    displayTotalPages,
    zoomLevel,
    canRotate,
    isRotating,
    moveControl,
    onZoomOut,
    onZoomIn,
    onZoomReset,
    onRotate,
    onClose,
}: Props) {
    const [moveToValue, setMoveToValue] = useState('');
    const showMoveTo = Boolean(moveControl && moveControl.totalPositions > 1);
    const moveOptions = moveControl
        ? Array.from({ length: moveControl.totalPositions }, (_, index) => index + 1)
        : [];

    const handleMoveToChange = useCallback((target: string) => {
        setMoveToValue(target);
        const targetIndex = Number.parseInt(target, 10) - 1;
        if (!moveControl || Number.isNaN(targetIndex) || targetIndex < 0 || targetIndex >= moveControl.totalPositions) {
            setMoveToValue('');
            return;
        }
        moveControl.onMoveToPosition(targetIndex);
        setMoveToValue('');
    }, [moveControl]);

    return (
        <div className="absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-black/60 px-4 py-2">
            <div className="justify-self-start">
                <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                    <button
                        onClick={onZoomOut}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                        title="Riduci (Ctrl+scroll giu)"
                    >
                        <MagnifyingGlassMinusIcon className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3rem] text-center font-mono text-xs font-medium text-white/80">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        onClick={onZoomIn}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                        title="Ingrandisci (Ctrl+scroll su)"
                    >
                        <MagnifyingGlassPlusIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onZoomReset}
                        className="rounded-md px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
                        title="Ripristina zoom (100%)"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="justify-self-center text-sm font-medium text-white/85">
                Page {displayCurrentPage} / {displayTotalPages}
            </div>

            <div className="flex items-center gap-2 justify-self-end">
                {canRotate && (
                    <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                        <button
                            onClick={() => onRotate('ccw')}
                            disabled={isRotating}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                            title="Ruota 90 gradi antiorario"
                        >
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onRotate('cw')}
                            disabled={isRotating}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                            title="Ruota 90 gradi orario"
                        >
                            <ArrowUturnRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {showMoveTo && (
                    <div className="relative rounded-lg bg-white/10 text-white">
                        <select
                            value={moveToValue}
                            onChange={(event) => handleMoveToChange(event.target.value)}
                            className="h-9 appearance-none rounded-lg bg-transparent py-1 pl-3 pr-9 text-sm outline-none"
                            title="Sposta la pagina in un'altra posizione"
                        >
                            <option value="" className="text-slate-900">Move to</option>
                            {moveOptions.map((position) => (
                                <option
                                    key={position}
                                    value={position}
                                    disabled={position === moveControl?.currentPosition}
                                    className="text-slate-900"
                                >
                                    Move to {position}
                                </option>
                            ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/75" />
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Chiudi (Esc)"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
