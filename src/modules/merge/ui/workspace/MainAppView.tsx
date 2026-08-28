import type { ReactNode } from 'react';
import type { WorkspaceApi } from '@/modules/merge/application';
import { DragOverlay } from '@/shared/ui/workspace/DragOverlay';
import { EmptyState } from '@/shared/ui/workspace/EmptyState';
import { AppHeader } from './AppHeader';
import { MainWorkspaceLayout } from './MainWorkspaceLayout';
import type { OptimizeState } from './main-app.types';

export function MainAppView({
    renderSettingsMenu,
    openReportBug,
    tutorialStart,
    canHelp,
    renderAlwaysOnTopControl,
    canExport,
    canPreview,
    isDragOver,
    workspace,
    handleAddFiles,
    optimize,
    exportMerged,
    setShowFinalPreview,
    onExit,
}: {
    renderSettingsMenu: (onReportBug: () => void) => ReactNode;
    openReportBug: () => void;
    tutorialStart: () => void;
    canHelp: boolean;
    renderAlwaysOnTopControl: () => ReactNode;
    canExport: boolean;
    canPreview: boolean;
    isDragOver: boolean;
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    optimize: OptimizeState;
    exportMerged: () => Promise<void>;
    setShowFinalPreview: (value: boolean) => void;
    onExit: () => void;
}) {
    return (
        <>
            <AppHeader
                renderSettingsMenu={renderSettingsMenu}
                onReportBug={openReportBug}
                onPreview={() => setShowFinalPreview(true)}
                canPreview={canPreview}
                renderAlwaysOnTopControl={renderAlwaysOnTopControl}
                onHelp={tutorialStart}
                canHelp={canHelp}
                onExport={() => void exportMerged()}
                canExport={canExport}
                onExit={onExit}
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {isDragOver ? <DragOverlay /> : null}

                <MainWorkspaceLayout
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    optimize={optimize}
                />

                {workspace.files.length === 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col bg-ui-bg p-3 md:p-4">
                        <EmptyState onAddFiles={handleAddFiles} />
                    </div>
                )}
            </div>
        </>
    );
}
