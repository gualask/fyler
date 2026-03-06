import { useRef, useState, useEffect } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import type { JpegQuality } from '../domain';

interface Props {
    jpegEnabled: boolean;
    onJpegEnabled: (v: boolean) => void;
    jpegQuality: JpegQuality;
    onJpegQuality: (v: JpegQuality) => void;
    resizeEnabled: boolean;
    onResizeEnabled: (v: boolean) => void;
    maxPx: number;
    onMaxPx: (v: number) => void;
}

const QUALITY_OPTIONS: { value: JpegQuality; label: string }[] = [
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Media' },
    { value: 'low', label: 'Bassa' },
];

const MAX_PX_OPTIONS = [2560, 1920, 1280];

export function OptimizePopover({
    jpegEnabled, onJpegEnabled,
    jpegQuality, onJpegQuality,
    resizeEnabled, onResizeEnabled,
    maxPx, onMaxPx,
}: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const active = jpegEnabled || resizeEnabled;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                title="Opzioni ottimizzazione"
                className={[
                    'rounded-md p-1.5 transition-colors',
                    active
                        ? 'text-ui-accent hover:bg-ui-surface-hover'
                        : 'text-ui-text-dim hover:bg-ui-surface-hover',
                ].join(' ')}
            >
                <Cog6ToothIcon className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-ui-border bg-ui-surface p-4 shadow-lg">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ui-text-muted">
                        Ottimizzazione output
                    </p>

                    {/* Sezione JPEG */}
                    <div className="mb-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-ui-text">
                            <input
                                type="checkbox"
                                checked={jpegEnabled}
                                onChange={(e) => onJpegEnabled(e.target.checked)}
                                className="rounded accent-ui-accent"
                            />
                            Comprimi immagini (JPEG)
                        </label>
                        <div className="mt-2 flex gap-1">
                            {QUALITY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    disabled={!jpegEnabled}
                                    onClick={() => onJpegQuality(opt.value)}
                                    className={[
                                        'flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                                        'disabled:cursor-not-allowed disabled:opacity-40',
                                        jpegQuality === opt.value && jpegEnabled
                                            ? 'border-ui-accent bg-ui-accent text-white'
                                            : 'border-ui-border text-ui-text-secondary hover:bg-ui-surface-hover',
                                    ].join(' ')}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sezione Resize */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-ui-text">
                            <input
                                type="checkbox"
                                checked={resizeEnabled}
                                onChange={(e) => onResizeEnabled(e.target.checked)}
                                className="rounded accent-ui-accent"
                            />
                            Ridimensiona (lato lungo)
                        </label>
                        <select
                            disabled={!resizeEnabled}
                            value={maxPx}
                            onChange={(e) => onMaxPx(Number(e.target.value))}
                            className="mt-2 w-full rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-sm text-ui-text disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {MAX_PX_OPTIONS.map((px) => (
                                <option key={px} value={px}>
                                    {px} px
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
