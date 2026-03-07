import type { CompressionLevel, ImageFit, ResizeLevel } from '../hooks/useOptimize';

interface Props {
    compression: CompressionLevel;
    resize: ResizeLevel;
    imageFit: ImageFit;
    onCompressionChange: (v: CompressionLevel) => void;
    onResizeChange: (v: ResizeLevel) => void;
    onImageFitChange: (v: ImageFit) => void;
}

const COMPRESSION_OPTIONS: { value: CompressionLevel; label: string }[] = [
    { value: 'none', label: 'Nessuna' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
];

const RESIZE_OPTIONS: { value: ResizeLevel; label: string }[] = [
    { value: 'original', label: 'Originale' },
    { value: '2000', label: 'Max 2000px' },
    { value: '1500', label: 'Max 1500px' },
];

const IMAGE_FIT_OPTIONS: { value: ImageFit; label: string }[] = [
    { value: 'fit', label: 'Adatta' },
    { value: 'contain', label: 'Contieni' },
    { value: 'cover', label: 'Ritaglia' },
];

function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-ui-text-muted">
                {label}
            </span>
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-zinc-800">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={[
                            'rounded-md px-3 py-1 text-xs font-medium transition-all',
                            value === opt.value
                                ? 'bg-white text-ui-accent shadow-sm dark:bg-slate-700'
                                : 'text-ui-text-secondary hover:text-ui-text',
                        ].join(' ')}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function OutputPanel({ compression, resize, imageFit, onCompressionChange, onResizeChange, onImageFitChange }: Props) {
    return (
        <div className="flex items-center gap-6 px-6 py-3">
            <SegmentedControl
                label="Compressione"
                options={COMPRESSION_OPTIONS}
                value={compression}
                onChange={onCompressionChange}
            />

            <div className="h-8 w-px bg-ui-border" />

            <SegmentedControl
                label="Ridimensiona"
                options={RESIZE_OPTIONS}
                value={resize}
                onChange={onResizeChange}
            />

            <div className="h-8 w-px bg-ui-border" />

            <SegmentedControl
                label="Immagini"
                options={IMAGE_FIT_OPTIONS}
                value={imageFit}
                onChange={onImageFitChange}
            />

            <span className="ml-auto text-xs text-ui-text-muted">Dim. stimata: — MB</span>
        </div>
    );
}
