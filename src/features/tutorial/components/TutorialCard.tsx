import { motion } from 'motion/react';
import type { Ref } from 'react';

interface Props {
    text: string;
    stepLabel: string;
    primaryLabel: string;
    secondaryLabel?: string;
    className: string;
    style?: React.CSSProperties;
    cardRef?: Ref<HTMLDivElement>;
    onPrimary: () => void;
    onSecondary?: () => void;
}
export function TutorialCard({
    text,
    stepLabel,
    primaryLabel,
    secondaryLabel,
    className,
    style,
    cardRef,
    onPrimary,
    onSecondary,
}: Props) {
    return (
        <motion.div
            ref={cardRef}
            className={className}
            style={style}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
            <p className="text-sm text-ui-text">{text}</p>

            <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-ui-text-muted">{stepLabel}</span>

                <div className="flex items-center gap-3">
                    {secondaryLabel && onSecondary ? (
                        <button type="button" onClick={onSecondary} className="btn-ghost-sm">
                            {secondaryLabel}
                        </button>
                    ) : null}
                    <button type="button" onClick={onPrimary} className="btn-primary">
                        {primaryLabel}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
