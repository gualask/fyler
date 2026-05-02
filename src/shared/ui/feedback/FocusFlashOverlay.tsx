import { motion } from 'motion/react';

interface Props {
    flashKey: number;
    className: string;
}

export function FocusFlashOverlay({ flashKey, className }: Props) {
    return (
        <motion.div
            key={flashKey}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className={`pointer-events-none absolute z-10 bg-ui-accent/60 ${className}`}
        />
    );
}
