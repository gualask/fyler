import { useTranslation } from '@/i18n';
import { ColumnHeader } from '../../shared/layout/ColumnHeader';

interface Props {
    fileId: string;
    pageInput: string;
    pageInputError: string;
    allSelected: boolean;
    onPageInputChange: (value: string) => void;
    onPageInputCommit: () => void;
    onToggleAll: () => void;
}

export function PdfToolbar({
    fileId,
    pageInput,
    pageInputError,
    allSelected,
    onPageInputChange,
    onPageInputCommit,
    onToggleAll,
}: Props) {
    const { t } = useTranslation();

    return (
        <>
            <ColumnHeader title={t('pagePicker.title')}>
                <button
                    type="button"
                    onClick={onToggleAll}
                    className={[
                        'h-[34px] shrink-0 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wide transition-colors',
                        allSelected ? 'toggle-on' : 'toggle-off',
                    ].join(' ')}
                >
                    {allSelected ? t('pagePicker.clearAll') : t('pagePicker.selectAll')}
                </button>
                <div className="flex-1" />
                <div className="flex min-w-0 items-center gap-2">
                    <label htmlFor={`page-input-${fileId}`} className="column-toolbar-label">
                        {t('pagePicker.inputLabel')}
                    </label>
                    <input
                        id={`page-input-${fileId}`}
                        type="text"
                        inputMode="text"
                        value={pageInput}
                        placeholder={t('pagePicker.inputPlaceholder')}
                        onChange={(event) => onPageInputChange(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && onPageInputCommit()}
                        onBlur={onPageInputCommit}
                        className="input-base w-40 min-w-0"
                    />
                </div>
            </ColumnHeader>

            {pageInputError && (
                <div className="shrink-0 border-b border-ui-danger-border bg-ui-danger-soft px-4 py-2 text-xs text-ui-danger">
                    {pageInputError}
                </div>
            )}
        </>
    );
}
