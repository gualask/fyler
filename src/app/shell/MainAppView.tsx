import { DragOverlay, EmptyState, type WorkspaceApi } from '@/features/workspace';
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
    openAbout,
    tutorialStart,
    canHelp,
    onQuickAdd,
    canExport,
    canPreview,
    isDragOver,
    workspace,
    handleAddFiles,
    focusedSourcePageNum,
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
    openAbout: () => void;
    tutorialStart: () => void;
    canHelp: boolean;
    onQuickAdd: () => void;
    canExport: boolean;
    canPreview: boolean;
    isDragOver: boolean;
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    focusedSourcePageNum: number | null;
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
                    onOpenAbout: openAbout,
                }}
                onExport={() => void exportMerged()}
                canExport={canExport}
                onPreview={() => setShowFinalPreview(true)}
                canPreview={canPreview}
                onQuickAdd={onQuickAdd}
                onHelp={tutorialStart}
                canHelp={canHelp}
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {isDragOver && <DragOverlay />}

                {workspace.files.length === 0 ? (
                    <EmptyState onAddFiles={handleAddFiles} />
                ) : (
                    <MainWorkspaceLayout
                        workspace={workspace}
                        handleAddFiles={handleAddFiles}
                        focusedSourcePageNum={focusedSourcePageNum}
                        focusedSourceFlashKey={focusedSourceFlashKey}
                        optimize={optimize}
                    />
                )}
            </div>
        </>
    );
}
