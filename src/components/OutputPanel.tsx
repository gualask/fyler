import { useId, useState, type ReactNode } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

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

const COMPRESSION_TOOLTIP_ITEMS: {
    title: string;
    description: string;
}[] = [
    {
        title: 'Nessuna',
        description: 'Non ricodifica in JPEG: mantiene i dati immagine originali.',
    },
    {
        title: 'Media',
        description: 'Ricodifica in JPEG qualita 75%: buon compromesso tra peso e resa.',
    },
    {
        title: 'Alta',
        description: 'Ricodifica in JPEG qualita 55%: comprime di piu ma la perdita si vede prima.',
    },
];

const RESIZE_TOOLTIP_ITEMS: {
    title: string;
    description: string;
}[] = [
    {
        title: 'Originale',
        description: "Non ridimensiona: il lato lungo resta quello originale.",
    },
    {
        title: 'Max 2000px',
        description: "Riduce solo le immagini il cui lato lungo supera 2000px.",
    },
    {
        title: 'Max 1500px',
        description: "Riduce solo le immagini il cui lato lungo supera 1500px.",
    },
];

const IMAGE_FIT_TOOLTIP_ITEMS: {
    title: string;
    description: string;
    visual: ReactNode;
}[] = [
    {
        title: 'Adatta',
        description: "La pagina prende la dimensione dell'immagine: tutto visibile, senza cornice A4 fissa.",
        visual: <FitPreview mode="fit" />,
    },
    {
        title: 'Contieni',
        description: "Usa una pagina A4 e ci fa stare dentro l'immagine intera, con margini bianchi se necessario.",
        visual: <FitPreview mode="contain" />,
    },
    {
        title: 'Ritaglia',
        description: "Usa una pagina A4 piena: l'immagine copre tutta la pagina e le parti in eccesso vengono tagliate.",
        visual: <FitPreview mode="cover" />,
    },
];

function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const tooltipId = useId();

    return (
        <span
            className="info-tooltip"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className="info-tooltip-trigger"
                aria-label={`Mostra dettagli: ${label}`}
                aria-describedby={open ? tooltipId : undefined}
                aria-expanded={open}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={() => setOpen((current) => !current)}
            >
                <InformationCircleIcon className="h-3.5 w-3.5" />
            </button>

            {open ? (
                <span id={tooltipId} role="tooltip" className="info-tooltip-panel">
                    {children}
                </span>
            ) : null}
        </span>
    );
}

function TooltipSection({
    title,
    description,
    visual,
}: {
    title: string;
    description: string;
    visual?: ReactNode;
}) {
    return (
        <div className="info-tooltip-row">
            {visual ? <span className="info-tooltip-visual">{visual}</span> : null}
            <span className="min-w-0">
                <span className="info-tooltip-row-title">{title}</span>
                <span className="info-tooltip-row-copy">{description}</span>
            </span>
        </div>
    );
}

function TooltipContent({
    title,
    leadVisual,
    items,
}: {
    title: string;
    leadVisual?: ReactNode;
    items: { title: string; description: string; visual?: ReactNode }[];
}) {
    return (
        <>
            <span className="info-tooltip-title">{title}</span>
            {leadVisual ? <span className="info-tooltip-lead">{leadVisual}</span> : null}
            {items.map((item) => (
                <TooltipSection
                    key={item.title}
                    title={item.title}
                    description={item.description}
                    visual={item.visual}
                />
            ))}
        </>
    );
}

function FitPreview({ mode }: { mode: ImageFit }) {
    return (
        <span className={`fit-preview fit-preview-${mode}`} aria-hidden="true">
            <span className="fit-preview-overflow" />
            <span className="fit-preview-page">
                <span className="fit-preview-media" />
            </span>
        </span>
    );
}

function ResizeGuidePreview() {
    return (
        <span className="resize-guide" aria-hidden="true">
            <span className="resize-guide-label">lato lungo</span>
            <span className="resize-guide-rule" />
            <span className="resize-guide-cap resize-guide-cap-start" />
            <span className="resize-guide-cap resize-guide-cap-end" />
            <span className="resize-guide-frame">
                <span className="resize-guide-photo" />
            </span>
        </span>
    );
}

function ImageFitTooltip() {
    return (
        <TooltipContent
            title="Come viene resa l'immagine nella pagina finale"
            items={IMAGE_FIT_TOOLTIP_ITEMS}
        />
    );
}

function CompressionTooltip() {
    return (
        <TooltipContent
            title="Se attiva, le immagini vengono ricodificate in JPEG durante l'ottimizzazione"
            items={COMPRESSION_TOOLTIP_ITEMS}
        />
    );
}

function ResizeTooltip() {
    return (
        <TooltipContent
            title="Il limite si applica al lato lungo dell'immagine prima dell'export"
            leadVisual={<ResizeGuidePreview />}
            items={RESIZE_TOOLTIP_ITEMS}
        />
    );
}

function SegmentedControl<T extends string>({
    label,
    helpContent,
    options,
    value,
    onChange,
}: {
    label: string;
    helpContent?: ReactNode;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-ui-text-muted">
                {label}
                {helpContent ? <InfoTooltip label={label}>{helpContent}</InfoTooltip> : null}
            </span>
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-zinc-800">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={[
                            'rounded-md px-3 py-1 text-xs font-medium transition-all',
                            value === opt.value
                                ? 'segment-on'
                                : 'segment-off',
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
                helpContent={<CompressionTooltip />}
                options={COMPRESSION_OPTIONS}
                value={compression}
                onChange={onCompressionChange}
            />

            <div className="h-8 w-px bg-ui-border" />

            <SegmentedControl
                label="Ridimensiona"
                helpContent={<ResizeTooltip />}
                options={RESIZE_OPTIONS}
                value={resize}
                onChange={onResizeChange}
            />

            <div className="h-8 w-px bg-ui-border" />

            <SegmentedControl
                label="Immagini"
                helpContent={<ImageFitTooltip />}
                options={IMAGE_FIT_OPTIONS}
                value={imageFit}
                onChange={onImageFitChange}
            />

            <span className="ml-auto text-xs text-ui-text-muted">Dim. stimata: — MB</span>
        </div>
    );
}
