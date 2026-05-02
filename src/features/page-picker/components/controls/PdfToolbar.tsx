import { useRef } from 'react';
import { useTranslation } from '@/shared/i18n';
import { ToggleGroup, type ToggleOption } from '@/shared/ui';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';

interface Props {
    fileId: string;
    pageCount: number;
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
    pageCount,
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

    const options: ToggleOption<'all' | 'none' | 'custom'>[] = [
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
        <SectionHeader
            title={t('pagePicker.sectionTitle', { count: pageCount })}
            className="border-b-0"
            toolbarClassName="flex-1 justify-start gap-3"
        >
            <ToggleGroup
                className="shrink-0"
                options={options}
                value={mode}
                onChange={handleSegmentChange}
            />

            <div className="flex min-w-0 flex-1 items-center gap-2">
                <label htmlFor={`page-input-${fileId}`} className="section-toolbar-label sr-only">
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
                    className="input-base h-8 w-full min-w-0 max-w-[18rem] bg-ui-bg"
                />
            </div>
        </SectionHeader>
    );
}
