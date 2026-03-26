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
        iconClass: 'text-emerald-600 dark:text-emerald-400',
        className:
            'border-emerald-300 bg-emerald-100 text-emerald-900 shadow-lg shadow-emerald-600/10 dark:border-emerald-800/40 dark:bg-emerald-950/60 dark:text-emerald-200',
    },
    error: {
        icon: IconX,
        iconClass: 'text-red-600 dark:text-red-400',
        className:
            'border-red-200 bg-red-50 text-red-800 shadow-lg shadow-red-600/8 dark:border-red-800/40 dark:bg-red-950/60 dark:text-red-200',
    },
    warning: {
        icon: IconAlertTriangle,
        iconClass: 'text-amber-600 dark:text-amber-400',
        className:
            'border-amber-200 bg-amber-50 text-amber-800 shadow-lg shadow-amber-600/8 dark:border-amber-800/40 dark:bg-amber-950/60 dark:text-amber-200',
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
