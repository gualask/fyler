import { PreviewModal } from '@/features/preview';
import { SupportDialog } from '@/features/support';
import { TutorialOverlay } from '@/features/tutorial';
import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import type { FileEdits, FinalPage, ImageFit, SourceFile } from '@/shared/domain';
import { ProgressModal } from './ProgressModal';
import { Toast } from './Toast';

type NotificationsLike = {
    statusMessage: string | null;
    statusTone: 'success' | 'error' | 'warning' | null;
    loadingMessage: string | null;
    loadingProgress?: number;
};

type SupportLike = {
    supportDialogMode: 'report' | 'about' | null;
    diagnosticsSnapshot: DiagnosticsSnapshot;
    closeSupportDialog: () => void;
    copyDiagnostics: () => Promise<void>;
    openGitHubIssues: () => Promise<void>;
    openReportBug: () => void;
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
    notifications: NotificationsLike;
    support: SupportLike;
    tutorial: TutorialLike;
    showFinalPreview: boolean;
    setShowFinalPreview: (value: boolean) => void;
    workspace: WorkspaceLike;
    imageFit: ImageFit;
}) {
    return (
        <>
            {notifications.statusMessage && notifications.statusTone && (
                <Toast
                    key={notifications.statusMessage}
                    message={notifications.statusMessage}
                    tone={notifications.statusTone}
                />
            )}

            {notifications.loadingMessage && (
                <ProgressModal
                    message={notifications.loadingMessage}
                    progress={notifications.loadingProgress}
                />
            )}

            <SupportDialog
                key={support.supportDialogMode ?? 'closed'}
                mode={support.supportDialogMode}
                snapshot={support.diagnosticsSnapshot}
                onClose={support.closeSupportDialog}
                onCopyDiagnostics={support.copyDiagnostics}
                onOpenGitHubIssues={support.openGitHubIssues}
                onOpenReportBug={support.openReportBug}
            />

            {tutorial.isActive && tutorial.currentStep !== null && (
                <TutorialOverlay
                    currentStep={tutorial.currentStep}
                    onNext={tutorial.next}
                    onSkip={tutorial.skip}
                />
            )}

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
        </>
    );
}
