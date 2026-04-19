import { motion } from 'motion/react';
import { type ReactNode, useId } from 'react';

export type ToggleOption<T extends string> = {
    value: T;
    label: ReactNode;
    ariaLabel?: string;
    title?: string;
    buttonClassName?: string;
    disabled?: boolean;
};

export function ToggleGroup<T extends string>({
    className,
    options,
    variant = 'default',
    value,
    onChange,
}: {
    className?: string;
    options: ToggleOption<T>[];
    variant?: 'default' | 'swatch';
    value: T;
    onChange: (v: T) => void;
}) {
    const indicatorId = useId();

    return (
        <div
            className={[
                'toggle-group__buttons relative',
                variant === 'swatch' ? 'toggle-group__buttons--swatch' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
        >
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    aria-label={opt.ariaLabel}
                    title={opt.title ?? opt.ariaLabel}
                    data-toggle-value={opt.value}
                    data-active={value === opt.value}
                    onClick={() => onChange(opt.value)}
                    className={[
                        'toggle-group__button relative z-[1]',
                        variant === 'swatch' ? 'toggle-group__button--swatch' : '',
                        value === opt.value
                            ? 'toggle-group__button-active'
                            : 'toggle-group__button-inactive',
                        opt.buttonClassName ?? '',
                    ].join(' ')}
                >
                    {value === opt.value ? (
                        <motion.span
                            layoutId={indicatorId}
                            initial={false}
                            aria-hidden
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className={[
                                'toggle-group__indicator absolute inset-0 pointer-events-none shadow-sm',
                                variant === 'swatch'
                                    ? 'toggle-group__indicator--swatch rounded-full'
                                    : 'toggle-group__indicator--default rounded-md',
                            ].join(' ')}
                        />
                    ) : null}
                    <span className="relative z-[1] inline-flex items-center justify-center">
                        {opt.label}
                    </span>
                </button>
            ))}
        </div>
    );
}
