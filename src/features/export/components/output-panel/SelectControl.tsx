import type { ReactNode } from 'react';

import { useTranslation } from '@/shared/i18n';
import { InfoTooltip, type TooltipAlign } from './InfoTooltip';

export type SelectOption<T extends string> = {
    value: T;
    label: string;
    disabled?: boolean;
};

export function SelectControl<T extends string>({
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
    options: SelectOption<T>[];
    value: T;
    onChange: (v: T) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className={['output-panel-group', className].filter(Boolean).join(' ')}>
            {label || helpContent ? (
                <span className="output-panel-label">
                    {label}
                    {helpContent ? (
                        <InfoTooltip label={label ?? t('outputPanel.details')} align={helpAlign}>
                            {helpContent}
                        </InfoTooltip>
                    ) : null}
                </span>
            ) : null}
            <select
                className="select-base"
                value={value}
                onChange={(event) => onChange(event.target.value as T)}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
