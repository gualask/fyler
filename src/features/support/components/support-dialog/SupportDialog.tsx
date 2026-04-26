import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';

import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { useModalFocus } from '@/shared/ui';

import { SupportIssueFormCard } from '../sections/report/IssueFormCard';
import { SupportDialogFooter } from './SupportDialogFooter';
import { useSupportDialogActions } from './support-dialog-actions.hook';
import { SupportTechnicalDetailsDisclosure } from './TechnicalDetailsDisclosure';

interface Props {
    open: boolean;
    snapshot: DiagnosticsSnapshot;
    onClose: () => void;
    onCopyDiagnostics: () => Promise<void>;
    onSaveDiagnosticsFile: (params: {
        defaultFilename: string;
        filterLabel: string;
    }) => Promise<string>;
    onOpenGitHubIssue: (params: {
        title: string;
        body: string;
    }) => Promise<'prefilled' | 'blank_fallback'>;
    onShowToast: (tone: 'success' | 'warning', message: string) => void;
    onShowError: (error: unknown) => void;
}

export function SupportDialog({
    open,
    snapshot,
    onClose,
    onCopyDiagnostics,
    onSaveDiagnosticsFile,
    onOpenGitHubIssue,
    onShowToast,
    onShowError,
}: Props) {
    const { t } = useTranslation();
    const [issueTitle, setIssueTitle] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const technicalDetailsId = useId();

    useModalFocus({
        active: open,
        containerRef: dialogRef,
        onEscape: onClose,
    });

    useEffect(() => {
        if (!open) {
            setIssueTitle('');
            setIssueDescription('');
            setShowTechnicalDetails(false);
        }
    }, [open]);

    const supportActions = useSupportDialogActions({
        issueTitle,
        issueDescription,
        snapshot,
        onCopyDiagnostics,
        onSaveDiagnosticsFile,
        onOpenGitHubIssue,
        onShowToast,
        onShowError,
    });

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="dialog-backdrop dialog-backdrop-padded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            onClose();
                        }
                    }}
                >
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        className="dialog-panel dialog-panel-bordered w-full max-w-2xl rounded-2xl"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-ui-border px-6 py-5">
                            <h2 id={titleId} className="min-w-0 text-lg font-semibold text-ui-text">
                                {t('support.dialog.reportTitle')}
                            </h2>
                            <span className="shrink-0 pt-1 text-[10px] font-medium tracking-[0.12em] text-ui-text-muted/85 select-text">
                                v{snapshot.app.version}
                            </span>
                        </div>

                        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                            <SupportIssueFormCard
                                title={issueTitle}
                                description={issueDescription}
                                onTitleChange={setIssueTitle}
                                onDescriptionChange={setIssueDescription}
                            />

                            <SupportTechnicalDetailsDisclosure
                                detailsId={technicalDetailsId}
                                expanded={showTechnicalDetails}
                                snapshot={snapshot}
                                onToggle={() => setShowTechnicalDetails((current) => !current)}
                            />
                        </div>

                        <SupportDialogFooter
                            canOpenIssue={supportActions.canOpenIssue}
                            onClose={onClose}
                            onCopyDiagnostics={supportActions.copyDiagnostics}
                            onSaveDiagnostics={supportActions.saveDiagnostics}
                            onOpenGitHubIssue={supportActions.openGitHubIssue}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
