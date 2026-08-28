import { lazy, Suspense, useEffect, useState } from 'react';

import { useAppNotifications } from '@/app/notifications';
import { useApplicationWindowPort } from '@/capabilities/application-window';
import { BatchCompressionWorkflow } from '@/modules/batch-compression';
import { MergeWorkflow } from '@/modules/merge/ui';
import { PageCompositionWorkflow } from '@/modules/page-composition';
import { useSupportDiagnostics } from '@/modules/support';
import { TaskHome } from '@/modules/task-home';
import {
    EMPTY_MERGE_DIAGNOSTICS,
    type MergeDiagnosticsSnapshot,
} from '@/shared/contracts/merge-diagnostics';
import { useTheme } from '@/shared/preferences';
import { type AppWindowProfile, applyAppWindowProfile } from './app-window-profile';
import { AppOverlays } from './overlays/AppOverlays';
import { TimedProgressModal } from './overlays/ProgressModal';
import { AlwaysOnTopButton, useAlwaysOnTop } from './shell/always-on-top';
import { AppSettingsMenu } from './shell/settings-menu/AppSettingsMenu';

const UpdateDialog =
    import.meta.env.MODE === 'standalone'
        ? null
        : lazy(() => import('./updates').then((module) => ({ default: module.UpdateDialog })));

function UpdateDialogSlot() {
    if (!UpdateDialog) return null;

    return (
        <Suspense fallback={null}>
            <UpdateDialog />
        </Suspense>
    );
}

export function AppContent() {
    const notifications = useAppNotifications();
    const applicationWindow = useApplicationWindowPort();
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const [mergeDiagnostics, setMergeDiagnostics] =
        useState<MergeDiagnosticsSnapshot>(EMPTY_MERGE_DIAGNOSTICS);
    const alwaysOnTop = useAlwaysOnTop(applicationWindow, notifications.showError);
    const support = useSupportDiagnostics({
        isDark,
        isAlwaysOnTop: alwaysOnTop.isAlwaysOnTop,
        ...mergeDiagnostics,
    });
    const [operation, setOperation] = useState<AppWindowProfile>('home');

    useEffect(() => {
        if (operation !== 'merge') setMergeDiagnostics(EMPTY_MERGE_DIAGNOSTICS);
    }, [operation]);

    useEffect(() => {
        let active = true;
        void applyAppWindowProfile(applicationWindow, operation, () => active).catch(
            () => undefined,
        );
        return () => {
            active = false;
        };
    }, [applicationWindow, operation]);

    const settingsMenu = (onReportBug = support.openReportBug) => (
        <AppSettingsMenu
            isDark={isDark}
            accent={accent}
            onToggleTheme={toggleTheme}
            onSetAccent={setAccent}
            onReportBug={onReportBug}
        />
    );

    const progressOverlay = () => (
        <TimedProgressModal
            message={
                notifications.loadingProgress === undefined ? null : notifications.loadingMessage
            }
            progress={notifications.loadingProgress}
            progressLabel={notifications.loadingProgressLabel}
            elapsedTimeLabel={notifications.loadingElapsedTimeLabel}
        />
    );

    const alwaysOnTopControl = () => (
        <AlwaysOnTopButton
            active={alwaysOnTop.isAlwaysOnTop}
            disabled={alwaysOnTop.isChangingAlwaysOnTop}
            onToggle={alwaysOnTop.toggle}
        />
    );

    const returnHome = () => {
        void alwaysOnTop.disable().then((didDisable) => {
            if (didDisable) setOperation('home');
        });
    };

    return (
        <>
            <UpdateDialogSlot />
            <AppOverlays notifications={notifications} support={support} />
            {operation === 'home' ? (
                <TaskHome
                    onOpenMerge={() => setOperation('merge')}
                    onOpenPageComposition={() => setOperation('page-composition')}
                    onOpenBatchCompression={() => setOperation('batch-compression')}
                    renderSettingsMenu={() => settingsMenu()}
                />
            ) : null}
            {operation === 'merge' ? (
                <MergeWorkflow
                    notifications={notifications}
                    onReportBug={support.openReportBug}
                    onDiagnosticsChange={setMergeDiagnostics}
                    onExit={returnHome}
                    settings={{ renderSettingsMenu: settingsMenu }}
                    renderAlwaysOnTopControl={alwaysOnTopControl}
                    renderProgressOverlay={progressOverlay}
                />
            ) : null}
            {operation === 'page-composition' ? (
                <PageCompositionWorkflow
                    notifications={notifications}
                    onExit={returnHome}
                    renderSettingsMenu={() => settingsMenu()}
                    renderAlwaysOnTopControl={alwaysOnTopControl}
                    renderProgressOverlay={progressOverlay}
                />
            ) : null}
            {operation === 'batch-compression' ? (
                <BatchCompressionWorkflow
                    notifications={notifications}
                    onExit={returnHome}
                    renderSettingsMenu={() => settingsMenu()}
                    renderAlwaysOnTopControl={alwaysOnTopControl}
                    renderProgressOverlay={progressOverlay}
                />
            ) : null}
        </>
    );
}
