import { useEffect } from 'react';
import { useTranslation } from '@/shared/i18n';

interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function ClearFilesDialog({ open, onClose, onConfirm }: Props) {
    const { t } = useTranslation();

    useEscapeToClose(open, onClose);

    if (!open) return null;

    return (
        <div
            className="dialog-backdrop dialog-backdrop-padded"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="dialog-panel dialog-panel-bordered w-full max-w-md rounded-2xl">
                <div className="border-b border-ui-border px-6 py-5">
                    <h2 className="text-lg font-semibold text-ui-text">
                        {t('fileList.clearConfirmTitle')}
                    </h2>
                    <p className="mt-1 text-sm text-ui-text-muted">
                        {t('fileList.clearConfirmBody')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4">
                    <button type="button" className="btn-ghost" onClick={onClose}>
                        {t('fileList.clearConfirmCancel')}
                    </button>
                    <button type="button" className="btn-danger" onClick={onConfirm}>
                        {t('fileList.clearConfirmOk')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function useEscapeToClose(active: boolean, onClose: () => void) {
    useEffect(() => {
        if (!active) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, [active, onClose]);
}
