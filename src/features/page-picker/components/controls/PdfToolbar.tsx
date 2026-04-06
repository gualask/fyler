import { useRef } from 'react';
import { useTranslation } from '@/shared/i18n';
import type { SegmentOption } from '@/shared/ui/controls/SegmentButtons';
import { SegmentButtons } from '@/shared/ui/controls/SegmentButtons';
import { ColumnHeader } from '@/shared/ui/layout/ColumnHeader';

interface Props {
    fileId: string;
    pageInput: string;
    onPageInputChange: (value: string) => void;
    onPageInputCommit: () => void;
    onPageInputFocus: () => void;
    onPageInputBlur: () => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onEnableManual: () => void;
    mode: 'all' | 'none' | 'custom';
}

export function PdfToolbar({
    fileId,
    pageInput,
    onPageInputChange,
    onPageInputCommit,
    onPageInputFocus,
    onPageInputBlur,
    onSelectAll,
    onClearSelection,
    onEnableManual,
    mode,
}: Props) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const options: SegmentOption<'all' | 'none' | 'custom'>[] = [
        { value: 'all', label: t('pagePicker.selectAll') },
        { value: 'none', label: t('pagePicker.clearAll') },
        { value: 'custom', label: t('pagePicker.manual') },
    ];

    const handleSegmentChange = (value: 'all' | 'none' | 'custom') => {
        if (value === 'all') {
            onSelectAll();
            return;
        }
        if (value === 'none') {
            onClearSelection();
            return;
        }

        onEnableManual();
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    return (
        <ColumnHeader title={null}>
            <SegmentButtons options={options} value={mode} onChange={handleSegmentChange} />

            <div className="flex min-w-0 items-center gap-2">
                <label htmlFor={`page-input-${fileId}`} className="column-toolbar-label sr-only">
                    {t('pagePicker.inputLabel')}
                </label>
                <input
                    ref={inputRef}
                    id={`page-input-${fileId}`}
                    type="text"
                    inputMode="text"
                    value={pageInput}
                    placeholder={t('pagePicker.inputPlaceholder')}
                    aria-label={t('pagePicker.inputLabel')}
                    onChange={(event) => onPageInputChange(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && onPageInputCommit()}
                    onFocus={onPageInputFocus}
                    onBlur={() => {
                        onPageInputBlur();
                        onPageInputCommit();
                    }}
                    className="input-base w-40 min-w-0"
                />
            </div>
        </ColumnHeader>
    );
}
