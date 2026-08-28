import { useId } from 'react';

import { useTranslation } from '@/shared/i18n';
import { formatByteSize } from '@/shared/ui/format/byte-size';
import type { BatchRunProgress, BatchSummary } from '../../model';

const SUMMARY_ITEMS = [
    ['batch.summary.compressed', 'compressed'],
    ['batch.summary.optimized', 'alreadyOptimized'],
    ['batch.summary.skipped', 'skipped'],
    ['batch.summary.failed', 'failed'],
] as const;

function BatchRunProgressBar({ runProgress }: { runProgress: BatchRunProgress }) {
    const { t } = useTranslation();
    const percentage = Math.min(
        100,
        Math.max(0, Math.round((runProgress.completed / Math.max(runProgress.total, 1)) * 100)),
    );

    return (
        <div
            className="mt-2 h-1 overflow-hidden rounded-full bg-ui-surface-hover"
            role="progressbar"
            aria-label={t('batch.progress.label')}
            aria-valuemin={0}
            aria-valuemax={runProgress.total}
            aria-valuenow={Math.min(runProgress.completed, runProgress.total)}
        >
            <div
                className="h-full origin-left rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none"
                style={{
                    transform: `scaleX(${percentage / 100})`,
                    backgroundColor: 'var(--ui-accent-solid)',
                }}
            />
        </div>
    );
}

function BatchOutcomeCounts({ summary }: { summary: BatchSummary }) {
    const { t } = useTranslation();
    return (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {SUMMARY_ITEMS.map(([label, key]) => (
                <div key={label} className="flex items-baseline justify-between gap-2 text-xs">
                    <dt className="text-ui-text-muted">{t(label)}</dt>
                    <dd className="font-semibold tabular-nums text-ui-text">{summary[key]}</dd>
                </div>
            ))}
        </dl>
    );
}

function BatchOutputSize({ summary }: { summary: BatchSummary }) {
    const { locale, t } = useTranslation();
    if (summary.outputBytes <= 0) return null;

    return (
        <p className="mt-3 rounded-lg bg-ui-surface-hover px-3 py-2 text-center text-xs font-semibold tabular-nums text-ui-text-secondary">
            {t('batch.summary.bytes', {
                original: formatByteSize(summary.originalBytes, locale),
                output: formatByteSize(summary.outputBytes, locale),
            })}
        </p>
    );
}

export function ResultsSummary({
    summary,
    runProgress,
}: {
    summary: BatchSummary;
    runProgress: BatchRunProgress | null;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const total = summary.compressed + summary.alreadyOptimized + summary.skipped + summary.failed;
    if (!total && !runProgress) return null;

    return (
        <section className="border-t border-ui-border pt-5" aria-labelledby={titleId}>
            <div className="flex items-baseline justify-between gap-3">
                <h3 id={titleId} className="text-sm font-semibold text-ui-text">
                    {t('batch.summary.title')}
                </h3>
                {runProgress ? (
                    <span className="text-xs font-semibold tabular-nums text-ui-text-secondary">
                        {runProgress.completed} / {runProgress.total}
                    </span>
                ) : null}
            </div>
            {runProgress ? <BatchRunProgressBar runProgress={runProgress} /> : null}
            <BatchOutcomeCounts summary={summary} />
            <BatchOutputSize summary={summary} />
        </section>
    );
}
