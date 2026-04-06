import { useCallback, useEffect, useRef, useState } from 'react';

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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const hasAnimated = useRef(false);
    const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 });

    const sync = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const active = container.querySelector<HTMLElement>(`[data-segment-value="${value}"]`);
        if (!active) {
            setPillStyle({ opacity: 0 });
            return;
        }

        const shouldAnimate = hasAnimated.current;
        hasAnimated.current = true;

        setPillStyle({
            transform: `translateX(${active.offsetLeft}px)`,
            width: active.offsetWidth,
            height: active.offsetHeight,
            opacity: 1,
            transition: shouldAnimate
                ? 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), width 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms'
                : 'none',
        });
    }, [value]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => sync());
        observer.observe(el);
        return () => observer.disconnect();
    }, [sync]);

    useEffect(() => {
        const id = requestAnimationFrame(sync);
        return () => cancelAnimationFrame(id);
    }, [sync]);

    return (
        <div
            ref={containerRef}
            className={['segmented-control__buttons relative', className].filter(Boolean).join(' ')}
        >
            <div
                aria-hidden
                className="segmented-control__pill absolute top-1 left-0 rounded-md bg-ui-accent shadow-sm"
                style={pillStyle}
            />
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    data-segment-value={opt.value}
                    data-active={value === opt.value}
                    onClick={() => onChange(opt.value)}
                    className={[
                        'segmented-control__button relative z-[1]',
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
