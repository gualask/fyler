import { ColumnHeader } from '../../shared/layout/ColumnHeader';
import { useTranslation } from '@/i18n';

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
                        className="input-base h-[34px] w-40 min-w-0"
                    />
                </div>
                <button
                    onClick={onToggleAll}
                    className={[
                        'h-[34px] shrink-0 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wide transition-colors',
                        allSelected ? 'toggle-on' : 'toggle-off',
                    ].join(' ')}
                >
                    {allSelected ? t('pagePicker.clearAll') : t('pagePicker.selectAll')}
                </button>
            </ColumnHeader>

            {pageInputError && (
                <div className="shrink-0 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-500">
                    {pageInputError}
                </div>
            )}
        </>
    );
}
