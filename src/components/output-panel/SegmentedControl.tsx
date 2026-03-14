import type { ReactNode } from 'react';

import { useTranslation } from '../../i18n';
import { InfoTooltip, type TooltipAlign } from './InfoTooltip';

export type SegmentOption<T extends string> = {
    value: T;
    label: string;
    disabled?: boolean;
};

export function SegmentButtons<T extends string>({
    className,
    options,
    value,
    onChange,
}: {
    className?: string;
    options: SegmentOption<T>[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className={['segmented-control__buttons', className].filter(Boolean).join(' ')}>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => onChange(opt.value)}
                    className={[
                        'segmented-control__button',
                        value === opt.value
                            ? 'segmented-control__button-active'
                            : 'segmented-control__button-inactive',
                    ].join(' ')}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

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
