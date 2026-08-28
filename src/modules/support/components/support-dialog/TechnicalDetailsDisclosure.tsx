import { IconChevronDown } from '@tabler/icons-react';
import { useMemo } from 'react';

import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

import { SupportReportSections } from '../sections/report/ReportSections';

export function SupportTechnicalDetailsDisclosure({
    detailsId,
    expanded,
    snapshot,
    onToggle,
}: {
    detailsId: string;
    expanded: boolean;
    snapshot: DiagnosticsSnapshot;
    onToggle: () => void;
}) {
    const { t } = useTranslation();
    const recentEvents = useMemo(
        () => [...snapshot.recentEvents].reverse(),
        [snapshot.recentEvents],
    );

    return (
        <section className="border-t border-ui-border/70 pt-4">
            <button
                type="button"
                aria-expanded={expanded}
                aria-controls={detailsId}
                className="group flex w-full items-start justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-ui-bg/20 hover:text-ui-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-muted focus-visible:ring-offset-2 focus-visible:ring-offset-ui-surface"
                onClick={onToggle}
            >
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-ui-text">
                        {t('support.dialog.technicalDetailsTitle')}
                    </p>
                    <p className="mt-1 max-w-[54ch] text-xs leading-5 text-ui-text-muted">
                        {t('support.dialog.technicalDetailsDescription')}
                    </p>
                </div>
                <IconChevronDown
                    aria-hidden="true"
                    className={[
                        'mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted transition-transform duration-200 group-hover:text-ui-text-secondary',
                        expanded ? 'rotate-180' : '',
                    ].join(' ')}
                />
            </button>

            {expanded ? (
                <div
                    id={detailsId}
                    className="mt-3 rounded-xl border border-ui-border/70 bg-ui-bg/20 px-4 py-4"
                >
                    <SupportReportSections snapshot={snapshot} recentEvents={recentEvents} />
                </div>
            ) : null}
        </section>
    );
}
