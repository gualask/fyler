import {
    JPEG_QUALITY_OPTIONS,
    MAX_PX_OPTIONS,
    OPTIMIZATION_PRESETS,
} from '../../optimizationConfig';
import type { ImageFit } from '../../domain';

import { TooltipContent, type TooltipItem } from './InfoTooltip';

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

const IMAGE_FIT_TOOLTIP_ITEMS: TooltipItem[] = [
    {
        title: 'Contieni',
        description: "Usa una pagina A4 e ci fa stare dentro l'immagine intera, con margini bianchi se necessario.",
        visual: <FitPreview mode="contain" />,
    },
    {
        title: 'Adatta',
        description: "La pagina prende la dimensione dell'immagine: tutto visibile, senza cornice A4 fissa.",
        visual: <FitPreview mode="fit" />,
    },
    {
        title: 'Ritaglia',
        description: "Usa una pagina A4 piena: l'immagine copre tutta la pagina e le parti in eccesso vengono tagliate.",
        visual: <FitPreview mode="cover" />,
    },
];

export function OptimizationTooltip() {
    return (
        <TooltipContent
            title="Preset rapidi per l'ottimizzazione delle immagini"
            items={OPTIMIZATION_PRESETS.map(({ label, description }) => ({
                title: label,
                description,
            }))}
        />
    );
}

export function JpegTooltip() {
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

export function ResizeTooltip() {
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

export function ImageFitTooltip() {
    return (
        <TooltipContent
            title="Come viene resa l'immagine nella pagina finale"
            items={IMAGE_FIT_TOOLTIP_ITEMS}
        />
    );
}
