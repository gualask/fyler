import { IconFolder } from '@tabler/icons-react';
import { useId } from 'react';

import { useTranslation } from '@/shared/i18n';
import { Tooltip } from '@/shared/ui/feedback/tooltip';

function folderName(path: string): string {
    return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

export function DestinationPicker({
    destinationPath,
    busy,
    onChooseDestination,
}: {
    destinationPath: string;
    busy: boolean;
    onChooseDestination: () => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    return (
        <section className="mt-6 border-t border-ui-border pt-5" aria-labelledby={titleId}>
            <h3 id={titleId} className="text-sm font-semibold text-ui-text">
                {t('batch.destination.title')}
            </h3>
            <Tooltip
                className="mt-2 block w-full min-w-0"
                openOnClick={false}
                panelClassName="w-max max-w-[min(24rem,calc(100vw-1rem))] px-2 py-1 text-xs font-medium text-ui-text"
                renderTrigger={({ ariaDescribedBy, onFocus, onBlur }) => (
                    <button
                        type="button"
                        className="flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md bg-ui-surface-hover px-3 text-left outline-none transition-colors hover:bg-ui-accent-soft-hover focus-visible:ring-2 focus-visible:ring-ui-accent-muted disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={busy}
                        onClick={onChooseDestination}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        aria-describedby={ariaDescribedBy}
                        aria-label={t(
                            destinationPath
                                ? 'batch.destination.change'
                                : 'batch.destination.choose',
                        )}
                    >
                        <span className="shrink-0 text-ui-text-muted">
                            <IconFolder className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span
                            className={`min-w-0 flex-1 truncate text-xs font-medium ${destinationPath ? 'text-ui-text-secondary' : 'text-ui-text-muted'}`}
                        >
                            {destinationPath
                                ? folderName(destinationPath)
                                : t('batch.destination.notSelected')}
                        </span>
                    </button>
                )}
            >
                <span className="block [overflow-wrap:anywhere]">
                    {destinationPath || t('batch.destination.notSelected')}
                </span>
            </Tooltip>
        </section>
    );
}
