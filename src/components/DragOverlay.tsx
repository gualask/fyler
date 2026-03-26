import { IconFileDownload } from '@tabler/icons-react';
import { useTranslation } from '@/i18n';

export function DragOverlay() {
    const { t } = useTranslation();

    return (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-ui-accent/60 bg-ui-accent/20 backdrop-blur-xs">
            <IconFileDownload className="h-12 w-12 text-ui-accent" stroke={1.5} />
            <span className="text-xl font-semibold text-ui-accent">
                {t('dragOverlay.releaseFiles')}
            </span>
        </div>
    );
}
