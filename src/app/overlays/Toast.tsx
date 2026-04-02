import { IconAlertTriangle, IconCheck, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

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
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const frameId = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frameId);
    }, []);

    const { icon: Icon, iconClass, className } = toneConfig[tone];

    return (
        <div
            className={[
                'fixed bottom-6 left-1/2 z-[100] flex max-w-[min(28rem,calc(100vw-2rem))] items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-300 ease-out',
                className,
                visible
                    ? 'translate-x-[-50%] translate-y-0 opacity-100'
                    : 'translate-x-[-50%] translate-y-3 opacity-0',
            ].join(' ')}
            role="status"
            aria-live="polite"
        >
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} stroke={2} />
            <span className="min-w-0 truncate">{message}</span>
        </div>
    );
}
