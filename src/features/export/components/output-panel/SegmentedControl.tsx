import type { ReactNode } from 'react';

import { useTranslation } from '@/shared/i18n';
import type { SegmentOption } from '@/shared/ui/controls/SegmentButtons';
import { SegmentButtons } from '@/shared/ui/controls/SegmentButtons';
import { InfoTooltip, type TooltipAlign } from './InfoTooltip';

export type { SegmentOption } from '@/shared/ui/controls/SegmentButtons';
export { SegmentButtons } from '@/shared/ui/controls/SegmentButtons';

export function SegmentedControl<T extends string>({
    label,
    helpContent,
    helpAlign,
    className,
    options,
    value,
    onChange,
}: {
    label?: string;
    helpContent?: ReactNode;
    helpAlign?: TooltipAlign;
    className?: string;
    options: SegmentOption<T>[];
    value: T;
    onChange: (v: T) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className={['segmented-control', className].filter(Boolean).join(' ')}>
            {label || helpContent ? (
                <span className="segmented-control__label">
                    {label}
                    {helpContent ? (
                        <InfoTooltip label={label ?? t('outputPanel.details')} align={helpAlign}>
                            {helpContent}
                        </InfoTooltip>
                    ) : null}
                </span>
            ) : null}
            <SegmentButtons options={options} value={value} onChange={onChange} />
        </div>
    );
}
