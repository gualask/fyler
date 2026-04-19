import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const pillRef = useRef<HTMLDivElement | null>(null);
    const hasAnimated = useRef(false);

    const sync = useCallback(() => {
        const container = containerRef.current;
        const pill = pillRef.current;
        if (!container || !pill) return;
        const active = container.querySelector<HTMLElement>(`[data-toggle-value="${value}"]`);
        if (!active) {
            container.dataset.pillReady = 'false';
            pill.style.opacity = '0';
            return;
        }

        container.dataset.pillReady = 'true';
        pill.style.transform = `translateX(${active.offsetLeft}px)`;
        pill.style.width = `${active.offsetWidth}px`;
        pill.style.height = `${active.offsetHeight}px`;
        pill.style.opacity = '1';
        pill.style.transition = hasAnimated.current
            ? 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), width 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms'
            : 'none';

        hasAnimated.current = true;
    }, [value]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => sync());
        observer.observe(el);
        return () => observer.disconnect();
    }, [sync]);

    useLayoutEffect(() => {
        sync();
    }, [sync]);

    return (
        <div
            ref={containerRef}
            className={[
                'toggle-group__buttons relative',
                variant === 'swatch' ? 'toggle-group__buttons--swatch' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            data-pill-ready="false"
        >
            <div
                ref={pillRef}
                aria-hidden
                className={[
                    'toggle-group__pill absolute left-0 shadow-sm',
                    variant === 'swatch'
                        ? 'toggle-group__pill--swatch top-0.5 rounded-full'
                        : 'toggle-group__pill--default top-1 rounded-md',
                ].join(' ')}
            />
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
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
