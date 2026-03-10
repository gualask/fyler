import { useId, useState, type ReactNode } from 'react';
import {
    AdjustmentsHorizontalIcon,
    InformationCircleIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';

import type {
    BasicOptimizationPreset,
    ImageOptimizationPreset,
} from '../optimizationConfig';
import {
    JPEG_QUALITY_OPTIONS,
    MAX_PX_OPTIONS,
    OPTIMIZATION_PRESETS,
} from '../optimizationConfig';
import type { ImageFit } from '../domain';

type SegmentOption<T extends string> = {
    value: T;
    label: string;
    disabled?: boolean;
};

interface Props {
    imageFit: ImageFit;
    isAdvancedOpen: boolean;
    jpegQuality?: number;
    maxPx?: number;
    optimizationPreset: ImageOptimizationPreset;
    onAdvancedOpenChange: (isOpen: boolean) => void;
    onImageFitChange: (v: ImageFit) => void;
    onJpegQualityChange: (v: number | undefined) => void;
    onMaxPxChange: (v: number | undefined) => void;
    onOptimizationPresetChange: (v: BasicOptimizationPreset) => void;
}

const IMAGE_FIT_OPTIONS: SegmentOption<ImageFit>[] = [
    { value: 'fit', label: 'Adatta' },
    { value: 'contain', label: 'Contieni' },
    { value: 'cover', label: 'Ritaglia' },
];

const BASIC_PRESET_OPTIONS: SegmentOption<BasicOptimizationPreset>[] = OPTIMIZATION_PRESETS.map(
    ({ value, label }) => ({ value, label }),
);
const JPEG_OPTIONS: SegmentOption<string>[] = JPEG_QUALITY_OPTIONS.map(({ value, label }) => ({
    value: value === undefined ? 'off' : String(value),
    label,
}));
const MAX_LONG_SIDE_OPTIONS: SegmentOption<string>[] = MAX_PX_OPTIONS.map(({ value, label }) => ({
    value: value === undefined ? 'off' : String(value),
    label,
}));

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

function buildPresetOptions(preset: ImageOptimizationPreset): SegmentOption<ImageOptimizationPreset>[] {
    if (preset !== 'custom') return BASIC_PRESET_OPTIONS;
    return [...BASIC_PRESET_OPTIONS, { value: 'custom', label: 'Personal.', disabled: true }];
}

function encodeOptionalNumberOption(value: number | undefined) {
    return value === undefined ? 'off' : String(value);
}

function decodeOptionalNumberOption(option: string): number | undefined {
    if (option === 'off') return undefined;
    return Number(option);
}

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

function OptimizationTooltip() {
    return (
        <TooltipContent
            title="Preset intelligenti che combinano ridimensionamento e qualita JPEG"
            items={OPTIMIZATION_PRESETS.map(({ label, description }) => ({
                title: label,
                description,
            }))}
        />
    );
}

function JpegTooltip() {
    return (
        <TooltipContent
            title="Qualita numerica usata quando un'immagine viene ricodificata in JPEG"
            items={JPEG_QUALITY_OPTIONS.map(({ title, description }) => ({
                title,
                description,
            }))}
        />
    );
}

function ResizeTooltip() {
    return (
        <TooltipContent
            title="Il limite si applica al lato lungo dell'immagine prima dell'export"
            leadVisual={<ResizeGuidePreview />}
            items={MAX_PX_OPTIONS.map(({ title, description }) => ({
                title,
                description,
            }))}
        />
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

function SegmentedControl<T extends string>({
    label,
    helpContent,
    options,
    value,
    onChange,
}: {
    label: string;
    helpContent?: ReactNode;
    options: SegmentOption<T>[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="footer-control-group">
            <span className="footer-control-label">
                {label}
                {helpContent ? <InfoTooltip label={label}>{helpContent}</InfoTooltip> : null}
            </span>
            <div className="footer-segment-shell">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => onChange(opt.value)}
                        className={[
                            'footer-segment-btn',
                            value === opt.value ? 'segment-on' : 'segment-off',
                        ].join(' ')}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function FooterAction({
    label,
    actionLabel,
    icon,
    onClick,
}: {
    label: string;
    actionLabel: string;
    icon: ReactNode;
    onClick: () => void;
}) {
    return (
        <div className="footer-control-group">
            <span className="footer-control-label">
                {label}
            </span>
            <button
                type="button"
                onClick={onClick}
                className="footer-action-btn"
            >
                {icon}
                {actionLabel}
            </button>
        </div>
    );
}

export function OutputPanel({
    imageFit,
    isAdvancedOpen,
    jpegQuality,
    maxPx,
    optimizationPreset,
    onAdvancedOpenChange,
    onImageFitChange,
    onJpegQualityChange,
    onMaxPxChange,
    onOptimizationPresetChange,
}: Props) {
    const presetOptions = buildPresetOptions(optimizationPreset);

    return (
        <div className="relative z-20 flex items-center gap-6 overflow-visible px-6 py-3">
            {isAdvancedOpen ? (
                <div className="flex shrink-0 items-end gap-3">
                    <SegmentedControl
                        label="Qualita JPEG"
                        helpContent={<JpegTooltip />}
                        options={JPEG_OPTIONS}
                        value={encodeOptionalNumberOption(jpegQuality)}
                        onChange={(value) => onJpegQualityChange(decodeOptionalNumberOption(value))}
                    />
                    <SegmentedControl
                        label="Lato lungo max"
                        helpContent={<ResizeTooltip />}
                        options={MAX_LONG_SIDE_OPTIONS}
                        value={encodeOptionalNumberOption(maxPx)}
                        onChange={(value) => onMaxPxChange(decodeOptionalNumberOption(value))}
                    />
                    <FooterAction
                        label="Vista"
                        actionLabel="Preset"
                        icon={<Squares2X2Icon className="h-3.5 w-3.5" />}
                        onClick={() => onAdvancedOpenChange(false)}
                    />
                </div>
            ) : (
                <div className="flex shrink-0 items-end gap-3">
                    <SegmentedControl
                        label="Ottimizzazione immagini"
                        helpContent={<OptimizationTooltip />}
                        options={presetOptions}
                        value={optimizationPreset}
                        onChange={(value) => {
                            if (value !== 'custom') onOptimizationPresetChange(value);
                        }}
                    />
                    <FooterAction
                        label="Vista"
                        actionLabel="Avanzate"
                        icon={<AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />}
                        onClick={() => onAdvancedOpenChange(true)}
                    />
                </div>
            )}

            <div className="h-8 w-px shrink-0 bg-ui-border" />

            <SegmentedControl
                label="Immagini"
                helpContent={<ImageFitTooltip />}
                options={IMAGE_FIT_OPTIONS}
                value={imageFit}
                onChange={onImageFitChange}
            />

            <span className="ml-auto shrink-0 text-xs text-ui-text-muted">Dim. stimata: — MB</span>
        </div>
    );
}
