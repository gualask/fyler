import { IconFileUpload, IconPlus } from '@tabler/icons-react';
import { useTranslation } from '@/i18n';

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
                <div className="empty-state-enter flex h-20 w-20 items-center justify-center rounded-2xl bg-ui-surface-hover text-ui-text-secondary transition-colors group-hover:bg-ui-accent-soft group-hover:text-ui-accent-on-soft" style={{ animationDelay: '0ms' }}>
                    <IconFileUpload className="h-10 w-10 empty-state-breathe" stroke={1.75} />
                </div>
                <p className="empty-state-enter text-2xl font-semibold text-ui-text" style={{ animationDelay: '80ms' }}>
                    {t('emptyState.title')}
                </p>
                <p className="empty-state-enter max-w-md text-sm text-ui-text-muted" style={{ animationDelay: '160ms' }}>
                    {t('emptyState.description')}
                </p>
                <span
                    className="empty-state-enter mt-2 inline-flex items-center gap-2 text-sm font-medium text-ui-accent-on-soft transition-colors group-hover:text-ui-accent"
                    style={{ animationDelay: '240ms' }}
                >
                    <IconPlus className="h-4 w-4" />
                    {t('emptyState.addFiles')}
                </span>
            </div>
        </button>
    );
}
