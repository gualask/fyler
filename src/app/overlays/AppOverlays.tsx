import { AnimatePresence } from 'motion/react';
import type { AppNotificationsApi } from '@/app/notifications/app-notifications.types';
import { type SupportDiagnosticsApi, SupportDialog } from '@/modules/support';
import { Toast } from './Toast';

export function AppOverlays({
    notifications,
    support,
}: {
    notifications: AppNotificationsApi;
    support: SupportDiagnosticsApi;
}) {
    return (
        <>
            <AnimatePresence>
                {notifications.statusMessage && notifications.statusTone ? (
                    <Toast
                        key={notifications.statusMessage}
                        message={notifications.statusMessage}
                        tone={notifications.statusTone}
                    />
                ) : null}
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
        </>
    );
}
