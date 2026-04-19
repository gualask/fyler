import { IconFileUpload, IconPlus } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/shared/i18n';

interface EmptyStateProps {
    onAddFiles: () => void;
}

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
};

export function EmptyState({ onAddFiles }: EmptyStateProps) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            onClick={onAddFiles}
            className="group flex min-h-0 flex-1 bg-ui-bg p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent md:p-4"
        >
            <motion.div
                className="mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center gap-5 rounded-[1.75rem] border-2 border-dashed border-ui-border bg-ui-surface px-6 py-8 text-center transition-colors group-hover:border-ui-accent/30 group-hover:bg-ui-accent-soft/25 md:px-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-ui-surface-hover text-ui-text-secondary transition-colors group-hover:bg-ui-accent-soft group-hover:text-ui-accent-on-soft"
                    variants={itemVariants}
                >
                    <motion.span
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
                    >
                        <IconFileUpload className="h-10 w-10" stroke={1.75} />
                    </motion.span>
                </motion.div>

                <motion.p
                    className="max-w-xl text-2xl font-semibold text-ui-text"
                    variants={itemVariants}
                >
                    {t('emptyState.title')}
                </motion.p>

                <motion.p className="max-w-lg text-sm text-ui-text-muted" variants={itemVariants}>
                    {t('emptyState.description')}
                </motion.p>

                <motion.span
                    className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ui-accent-on-soft transition-colors group-hover:text-ui-accent"
                    variants={itemVariants}
                >
                    <IconPlus className="h-4 w-4" />
                    {t('emptyState.addFiles')}
                </motion.span>
            </motion.div>
        </button>
    );
}
