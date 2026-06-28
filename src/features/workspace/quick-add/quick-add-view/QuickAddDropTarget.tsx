import { IconFileDownload } from '@tabler/icons-react';
import { useTranslation } from '@/shared/i18n';

interface QuickAddDropTargetProps {
    hasAddedFiles: boolean;
}

export function QuickAddDropTarget({ hasAddedFiles }: QuickAddDropTargetProps) {
    const { t } = useTranslation();

    if (hasAddedFiles) {
        return (
            <section className="shrink-0 rounded-xl border-2 border-dashed border-ui-border bg-ui-surface px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ui-surface-subtle text-ui-text-secondary">
                        <IconFileDownload className="h-5 w-5" />
                    </div>
                    <p className="min-w-0 text-sm font-medium text-ui-text">
                        {t('quickAdd.dragMoreFiles')}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="min-h-28 flex-1 rounded-xl border-2 border-dashed border-ui-border bg-ui-surface px-6 py-8">
            <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ui-surface-subtle text-ui-text-secondary">
                    <IconFileDownload className="h-6 w-6" />
                </div>

                <div className="mt-4 flex max-w-sm flex-col gap-1.5">
                    <p className="text-base font-semibold text-ui-text">
                        {t('quickAdd.dragFiles')}
                    </p>
                    <p className="text-sm leading-6 text-ui-text-muted">{t('quickAdd.hint')}</p>
                </div>
            </div>
        </section>
    );
}
