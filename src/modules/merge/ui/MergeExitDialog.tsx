import { useId, useRef } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useModalFocus } from '@/shared/ui';

export function MergeExitDialog({
    onCancel,
    onDiscard,
}: {
    onCancel: () => void;
    onDiscard: () => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const ref = useRef<HTMLDivElement | null>(null);
    useModalFocus({ containerRef: ref, onEscape: onCancel });
    return (
        <div className="dialog-backdrop dialog-backdrop-padded dialog-backdrop-strong">
            <div
                ref={ref}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="dialog-panel dialog-panel-bordered w-full max-w-md rounded-2xl p-6 outline-none"
            >
                <h2 id={titleId} className="text-lg font-semibold text-ui-text">
                    {t('taskHome.discardMerge.title')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ui-text-dim">
                    {t('taskHome.discardMerge.description')}
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="btn-ghost" onClick={onCancel}>
                        {t('pageComposition.cancel')}
                    </button>
                    <button type="button" className="btn-danger" onClick={onDiscard}>
                        {t('pageComposition.discard.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
