import { IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';
import { motion } from 'motion/react';

type Tone = 'success' | 'error' | 'warning';

interface Props {
    message: string;
    tone: Tone;
}

const toneConfig: Record<Tone, { icon: typeof IconCheck; iconClass: string; className: string }> = {
    success: {
        icon: IconCheck,
        iconClass: 'text-ui-success',
        className:
            'border-ui-success-border bg-ui-success-soft text-ui-success-soft-text shadow-lg shadow-ui-success/10',
    },
    error: {
        icon: IconX,
        iconClass: 'text-ui-danger',
        className:
            'border-ui-danger-border bg-ui-danger-soft text-ui-danger-soft-text shadow-lg shadow-ui-danger/8',
    },
    warning: {
        icon: IconAlertTriangle,
        iconClass: 'text-ui-warning',
        className:
            'border-ui-warning-border bg-ui-warning-soft text-ui-warning-soft-text shadow-lg shadow-ui-warning/8',
    },
};

export function Toast({ message, tone }: Props) {
    const { icon: Icon, iconClass, className } = toneConfig[tone];

    return (
        <motion.div
            className={[
                'fixed bottom-6 left-1/2 z-[100] flex max-w-[min(28rem,calc(100vw-2rem))] items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium',
                className,
            ].join(' ')}
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            aria-live="polite"
        >
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} stroke={2} />
            <span className="min-w-0 truncate">{message}</span>
        </motion.div>
    );
}
