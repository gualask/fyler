import { useTranslation } from '@/shared/i18n';

interface QuickAddFooterProps {
    isTransitioning: boolean;
    onDone: () => void;
}

export function QuickAddFooter({ isTransitioning, onDone }: QuickAddFooterProps) {
    const { t } = useTranslation();

    return (
        <div className="flex shrink-0 pt-0.5">
            <button
                type="button"
                disabled={isTransitioning}
                onClick={onDone}
                className="btn-primary w-full justify-center"
            >
                {t('quickAdd.done')}
            </button>
        </div>
    );
}
