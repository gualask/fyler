import { IconAlertTriangle, IconCheck, IconLoader2, IconRefresh, IconX } from '@tabler/icons-react';

import type { TranslationKey } from '@/shared/i18n';
import { useTranslation } from '@/shared/i18n';
import { Tooltip } from '@/shared/ui/feedback/tooltip';
import { formatByteSize } from '@/shared/ui/format/byte-size';
import type { BatchFileState, BatchSkipReason, BatchSource } from '../../model';
import { BatchSourceThumbnail } from './BatchSourceThumbnail';

type Translate = ReturnType<typeof useTranslation>['t'];

const STATUS_LABELS = {
    ready: 'batch.status.ready',
    running: 'batch.status.running',
    compressed: 'batch.status.compressed',
    alreadyOptimized: 'batch.status.alreadyOptimized',
    skipped: 'batch.status.skipped',
    failed: 'batch.status.failed',
    needsUpdate: 'batch.status.needsUpdate',
} as const satisfies Record<BatchFileState, TranslationKey>;

const SKIP_LABELS = {
    unsupportedFormat: 'batch.skip.unsupportedFormat',
    animatedWebP: 'batch.skip.animatedWebP',
    protectedPdf: 'batch.skip.protectedPdf',
    digitallySignedPdf: 'batch.skip.digitallySignedPdf',
} as const satisfies Record<BatchSkipReason, TranslationKey>;

const STATUS_STYLES: Record<BatchFileState, string> = {
    ready: 'bg-ui-surface-hover text-ui-text-secondary',
    running: 'bg-ui-accent-soft text-ui-accent-on-soft',
    compressed: 'bg-ui-success-soft text-ui-success-soft-text',
    alreadyOptimized: 'bg-ui-success-soft text-ui-success-soft-text',
    skipped: 'bg-ui-warning-soft text-ui-warning-soft-text',
    failed: 'bg-ui-danger-soft text-ui-danger-soft-text',
    needsUpdate: 'bg-ui-accent-soft text-ui-accent-on-soft',
};

type ResultTooltipTrigger = {
    ariaDescribedBy?: string;
    ariaExpanded: boolean;
    onFocus: () => void;
    onBlur: () => void;
    onClick: () => void;
};

function outputName(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
}

function StatusIcon({ state }: { state: BatchFileState }) {
    if (state === 'running')
        return <IconLoader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />;
    if (state === 'compressed' || state === 'alreadyOptimized')
        return <IconCheck className="h-3.5 w-3.5" />;
    if (state === 'needsUpdate') return <IconRefresh className="h-3.5 w-3.5" />;
    if (state === 'failed' || state === 'skipped')
        return <IconAlertTriangle className="h-3.5 w-3.5" />;
    return null;
}

function StatusBadge({ source }: { source: BatchSource }) {
    const { t } = useTranslation();
    if (source.state === 'ready') return null;
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[source.state]}`}
        >
            <StatusIcon state={source.state} />
            {t(STATUS_LABELS[source.state])}
        </span>
    );
}

function OriginalDetails({ source }: { source: BatchSource }) {
    const { locale, t } = useTranslation();
    const originalBytes = source.result?.originalBytes ?? source.pickedOriginalBytes;
    const originalDimensions = source.result?.originalDimensions ?? source.originalDimensions;
    return (
        <p className="mt-0.5 truncate text-xs text-ui-text-muted">
            {formatByteSize(originalBytes, locale)}
            {originalDimensions ? ` · ${t('batch.result.dimensions', originalDimensions)}` : null}
        </p>
    );
}

function reductionLabel(
    t: Translate,
    source: BatchSource,
): { text: string; className: string } | null {
    const originalBytes = source.result?.originalBytes ?? source.pickedOriginalBytes;
    const outputBytes = source.result?.outputBytes;
    if (originalBytes <= 0 || outputBytes === undefined) return null;
    const percentage = Math.round((1 - outputBytes / originalBytes) * 100);
    return percentage >= 0
        ? {
              text: t('batch.result.saved', { percent: percentage }),
              className: 'text-ui-success-soft-text',
          }
        : {
              text: t('batch.result.larger', { percent: Math.abs(percentage) }),
              className: 'text-ui-danger-soft-text',
          };
}

function ResultDetails({
    source,
    tooltipTrigger,
}: {
    source: BatchSource;
    tooltipTrigger?: ResultTooltipTrigger;
}) {
    const { locale, t } = useTranslation();
    const outputBytes = source.result?.outputBytes;
    const outputDimensions = source.result?.outputDimensions;
    const reduction = reductionLabel(t, source);
    const issue = source.result?.skipReason
        ? t(SKIP_LABELS[source.result.skipReason])
        : source.result?.message;
    const outputPath = source.result?.outputPath;
    const hasOutput = outputBytes !== undefined || outputDimensions !== undefined;
    const outputLine = hasOutput ? (
        <span className="block truncate text-xs text-ui-text-secondary">
            {outputBytes !== undefined ? formatByteSize(outputBytes, locale) : null}
            {outputBytes !== undefined && outputDimensions ? ' · ' : null}
            {outputDimensions ? t('batch.result.dimensions', outputDimensions) : null}
            {reduction ? (
                <span className={`ml-2 font-semibold tabular-nums ${reduction.className}`}>
                    {reduction.text}
                </span>
            ) : null}
        </span>
    ) : null;

    return (
        <>
            {outputLine && outputPath && tooltipTrigger ? (
                <button
                    type="button"
                    className="mt-0.5 block max-w-full text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ui-accent"
                    aria-describedby={tooltipTrigger.ariaDescribedBy}
                    aria-expanded={tooltipTrigger.ariaExpanded}
                    onFocus={tooltipTrigger.onFocus}
                    onBlur={tooltipTrigger.onBlur}
                    onClick={tooltipTrigger.onClick}
                >
                    {outputLine}
                </button>
            ) : outputLine ? (
                <span className="mt-0.5 block min-w-0">{outputLine}</span>
            ) : null}
            {issue ? (
                <p className="mt-0.5 truncate text-xs text-ui-warning-soft-text" title={issue}>
                    {issue}
                </p>
            ) : null}
        </>
    );
}

function RowContents({
    source,
    busy,
    scrollRoot,
    tooltipTrigger,
    onRemove,
}: {
    source: BatchSource;
    busy: boolean;
    scrollRoot: HTMLUListElement | null;
    tooltipTrigger?: ResultTooltipTrigger;
    onRemove: () => void;
}) {
    const { t } = useTranslation();
    return (
        <>
            <BatchSourceThumbnail source={source} scrollRoot={scrollRoot} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ui-text" title={source.name}>
                    {source.name}
                </p>
                <OriginalDetails source={source} />
                <ResultDetails source={source} tooltipTrigger={tooltipTrigger} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <StatusBadge source={source} />
                <button
                    type="button"
                    className="btn-icon h-8 w-8 shrink-0 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    disabled={busy}
                    onClick={onRemove}
                    aria-label={t('batch.removeFile', { name: source.name })}
                >
                    <IconX className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </>
    );
}

export function BatchSourceRow({
    source,
    busy,
    scrollRoot,
    onRemove,
}: {
    source: BatchSource;
    busy: boolean;
    scrollRoot: HTMLUListElement | null;
    onRemove: () => void;
}) {
    const { t } = useTranslation();
    const outputPath = source.result?.outputPath;
    return (
        <li className="border-b border-ui-border last:border-b-0">
            {outputPath ? (
                <Tooltip
                    className="group flex min-h-20 w-full items-center gap-3 px-5 py-3"
                    panelClassName="max-w-72 px-2.5 py-1.5 text-xs text-ui-text"
                    renderTrigger={(tooltipTrigger) => (
                        <RowContents
                            source={source}
                            busy={busy}
                            scrollRoot={scrollRoot}
                            tooltipTrigger={tooltipTrigger}
                            onRemove={onRemove}
                        />
                    )}
                >
                    <span>
                        <strong className="font-semibold">{t('batch.result.savedAs')}</strong>{' '}
                        {outputName(outputPath)}
                    </span>
                </Tooltip>
            ) : (
                <div className="group flex min-h-20 items-center gap-3 px-5 py-3">
                    <RowContents
                        source={source}
                        busy={busy}
                        scrollRoot={scrollRoot}
                        onRemove={onRemove}
                    />
                </div>
            )}
        </li>
    );
}
