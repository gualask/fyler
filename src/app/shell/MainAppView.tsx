import { DragOverlay, EmptyState, type WorkspaceApi } from '@/features/workspace';
import type { SourceTarget } from '@/shared/domain';
import type { AccentColor } from '@/shared/preferences';
import { AppHeader } from './AppHeader';
import { MainWorkspaceLayout } from './MainWorkspaceLayout';
import type { OptimizeState } from './main-app.types';

export function MainAppView({
    isDark,
    accent,
    toggleTheme,
    setAccent,
    openReportBug,
    tutorialStart,
    canHelp,
    onQuickAdd,
    isQuickAddTransitioning,
    canExport,
    canPreview,
    isDragOver,
    workspace,
    handleAddFiles,
    focusedSourceTarget,
    focusedSourceFlashKey,
    optimize,
    exportMerged,
    setShowFinalPreview,
}: {
    isDark: boolean;
    accent: AccentColor;
    toggleTheme: () => void;
    setAccent: (accent: AccentColor) => void;
    openReportBug: () => void;
    tutorialStart: () => void;
    canHelp: boolean;
    onQuickAdd: () => void;
    isQuickAddTransitioning: boolean;
    canExport: boolean;
    canPreview: boolean;
    isDragOver: boolean;
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    focusedSourceTarget: SourceTarget | null;
    focusedSourceFlashKey?: number;
    optimize: OptimizeState;
    exportMerged: () => Promise<void>;
    setShowFinalPreview: (value: boolean) => void;
}) {
    return (
        <>
            <AppHeader
                settings={{
                    isDark,
                    accent,
                    onToggleTheme: toggleTheme,
                    onSetAccent: setAccent,
                    onReportBug: openReportBug,
                }}
                onPreview={() => setShowFinalPreview(true)}
                canPreview={canPreview}
                onQuickAdd={onQuickAdd}
                isQuickAddDisabled={isQuickAddTransitioning}
                onHelp={tutorialStart}
                canHelp={canHelp}
                onExport={() => void exportMerged()}
                canExport={canExport}
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {isDragOver && <DragOverlay />}

                <MainWorkspaceLayout
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    focusedSourceTarget={focusedSourceTarget}
                    focusedSourceFlashKey={focusedSourceFlashKey}
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
