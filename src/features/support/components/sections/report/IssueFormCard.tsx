import { useId } from 'react';

import { useTranslation } from '@/shared/i18n';

export function SupportIssueFormCard({
    title,
    description,
    onTitleChange,
    onDescriptionChange,
}: {
    title: string;
    description: string;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const descriptionId = useId();

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ui-text">
                {t('support.dialog.reportIssueSection')}
            </h3>

            <div className="space-y-1.5">
                <label htmlFor={titleId} className="text-xs font-semibold text-ui-text-muted">
                    {t('support.dialog.issueTitleLabel')}
                </label>
                <input
                    id={titleId}
                    type="text"
                    value={title}
                    placeholder={t('support.dialog.issueTitlePlaceholder')}
                    onChange={(event) => onTitleChange(event.target.value)}
                    className="input-base"
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor={descriptionId} className="text-xs font-semibold text-ui-text-muted">
                    {t('support.dialog.issueDescriptionLabel')}
                </label>
                <textarea
                    id={descriptionId}
                    value={description}
                    placeholder={t('support.dialog.issueDescriptionPlaceholder')}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    className="input-base h-auto min-h-[120px] resize-y py-2"
                />
                <p className="text-xs text-ui-text-muted">{t('support.dialog.issueHint')}</p>
            </div>
        </div>
    );
}
