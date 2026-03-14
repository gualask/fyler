import { DocumentArrowUpIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../i18n';

interface EmptyStateProps {
    onAddFiles: () => void;
}

export function EmptyState({ onAddFiles }: EmptyStateProps) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            onClick={onAddFiles}
            className="group flex min-h-0 flex-1 bg-ui-bg p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent"
        >
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border-4 border-dashed border-ui-border bg-ui-surface text-center transition-colors group-hover:border-ui-accent/40 group-hover:bg-ui-accent-soft/40">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ui-surface-hover text-ui-text-secondary transition-colors group-hover:bg-ui-accent-soft group-hover:text-ui-accent-on-soft">
                    <DocumentArrowUpIcon className="h-10 w-10" strokeWidth={1.75} />
                </div>
                <p className="text-2xl font-semibold text-ui-text">{t('emptyState.title')}</p>
                <p className="max-w-md text-sm text-ui-text-muted">
                    {t('emptyState.description')}
                </p>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ui-accent-on-soft transition-colors group-hover:text-ui-accent">
                    <PlusIcon className="h-4 w-4" />
                    {t('emptyState.addFiles')}
                </span>
            </div>
        </button>
    );
}
