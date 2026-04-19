import { AnimatePresence } from 'motion/react';
import { PreviewModal } from '@/features/preview';
import { SupportDialog } from '@/features/support';
import { TutorialOverlay } from '@/features/tutorial';
import type { AppNotificationsApi } from '@/shared/contracts/app-notifications.api';
import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import type { FileEdits, FinalPage, ImageFit, SourceFile } from '@/shared/domain';
import { ProgressModal } from './ProgressModal';
import { Toast } from './Toast';

type SupportLike = {
    isSupportDialogOpen: boolean;
    diagnosticsSnapshot: DiagnosticsSnapshot;
    closeSupportDialog: () => void;
    copyDiagnostics: () => Promise<void>;
    saveDiagnosticsFile: (params: {
        defaultFilename: string;
        filterLabel: string;
    }) => Promise<string>;
    openGitHubIssue: (params: {
        title: string;
        body: string;
    }) => Promise<'prefilled' | 'blank_fallback'>;
};

type TutorialLike = {
    isActive: boolean;
    currentStep: number | null;
    next: () => void;
    skip: () => void;
};

type WorkspaceLike = {
    finalPages: FinalPage[];
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
};

export function AppOverlays({
    notifications,
    support,
    tutorial,
    showFinalPreview,
    setShowFinalPreview,
    workspace,
    imageFit,
}: {
    notifications: AppNotificationsApi;
    support: SupportLike;
    tutorial: TutorialLike;
    showFinalPreview: boolean;
    setShowFinalPreview: (value: boolean) => void;
    workspace: WorkspaceLike;
    imageFit: ImageFit;
}) {
    return (
        <>
            <AnimatePresence>
                {notifications.statusMessage && notifications.statusTone && (
                    <Toast
                        key={notifications.statusMessage}
                        message={notifications.statusMessage}
                        tone={notifications.statusTone}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {notifications.loadingMessage && (
                    <ProgressModal
                        message={notifications.loadingMessage}
                        progress={notifications.loadingProgress}
                    />
                )}
            </AnimatePresence>

            <SupportDialog
                open={support.isSupportDialogOpen}
                snapshot={support.diagnosticsSnapshot}
                onClose={support.closeSupportDialog}
                onCopyDiagnostics={support.copyDiagnostics}
                onSaveDiagnosticsFile={support.saveDiagnosticsFile}
                onOpenGitHubIssue={support.openGitHubIssue}
                onShowToast={notifications.showToast}
                onShowError={notifications.showError}
            />

            <AnimatePresence>
                {tutorial.isActive && tutorial.currentStep !== null && (
                    <TutorialOverlay
                        currentStep={tutorial.currentStep}
                        onNext={tutorial.next}
                        onSkip={tutorial.skip}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFinalPreview && (
                    <PreviewModal
                        finalPages={workspace.finalPages}
                        files={workspace.files}
                        editsByFile={workspace.editsByFile}
                        imageFit={imageFit}
                        matchExportedImages
                        onClose={() => setShowFinalPreview(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
