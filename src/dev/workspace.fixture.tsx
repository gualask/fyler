import { useMemo, useState } from 'react';

import { AppSettingsMenu } from '@/app/shell/settings-menu/AppSettingsMenu';
import type { SourceFile } from '@/capabilities/document-sources';
import { PdfCacheProvider } from '@/infrastructure/pdfjs';
import type { FileEdits, FinalPage } from '@/modules/merge/model';
import { WorkspaceStoreProvider } from '@/modules/merge/model';
import { PreviewModal } from '@/modules/merge/ui/preview';
import { TutorialOverlay } from '@/modules/merge/ui/tutorial';
import { MainAppView } from '@/modules/merge/ui/workspace/MainAppView';
import { useTheme } from '@/shared/preferences';
import { useWorkspaceFixtureOptimization } from './workspace-fixture/workspace-fixture-optimization.hook';
import { getTutorialStep } from './workspace-fixture/workspace-fixture-route';
import { useWorkspaceFixtureWorkspaceApi } from './workspace-fixture/workspace-fixture-workspace-api.hook';

export function WorkspaceFixturePage({
    createInitialFiles,
    initialSelectedId = null,
    initialFinalPages,
    initialEditsByFile,
}: {
    createInitialFiles: () => SourceFile[];
    initialSelectedId?: string | null;
    initialFinalPages?: FinalPage[] | (() => FinalPage[]);
    initialEditsByFile?: Record<string, FileEdits> | (() => Record<string, FileEdits>);
}) {
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const tutorialStep = getTutorialStep(window.location.search);
    const [files, setFiles] = useState(createInitialFiles);
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
    const [finalPages, setFinalPages] = useState<FinalPage[]>(
        () =>
            (typeof initialFinalPages === 'function' ? initialFinalPages() : initialFinalPages) ??
            [],
    );
    const [editsByFile, setEditsByFile] = useState<Record<string, FileEdits>>(
        () =>
            (typeof initialEditsByFile === 'function'
                ? initialEditsByFile()
                : initialEditsByFile) ?? {},
    );
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const selectedFile = useMemo(
        () => files.find((file) => file.id === selectedId) ?? null,
        [files, selectedId],
    );
    const optimize = useWorkspaceFixtureOptimization();
    const workspace = useWorkspaceFixtureWorkspaceApi({
        files,
        setFiles,
        selectedId,
        setSelectedId,
        selectedFile,
        finalPages,
        setFinalPages,
        editsByFile,
        setEditsByFile,
    });

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            <PdfCacheProvider>
                <WorkspaceStoreProvider store={workspace.store}>
                    <MainAppView
                        renderSettingsMenu={(onReportBug) => (
                            <AppSettingsMenu
                                isDark={isDark}
                                accent={accent}
                                onToggleTheme={toggleTheme}
                                onSetAccent={setAccent}
                                onReportBug={onReportBug}
                            />
                        )}
                        openReportBug={() => undefined}
                        tutorialStart={() => undefined}
                        canHelp={files.length > 0}
                        renderAlwaysOnTopControl={() => (
                            <button type="button" className="btn-icon" aria-label="Always on top" />
                        )}
                        canExport={finalPages.length > 0}
                        canPreview={finalPages.length > 0}
                        isDragOver={false}
                        workspace={workspace}
                        handleAddFiles={() => undefined}
                        optimize={optimize}
                        exportMerged={async () => undefined}
                        setShowFinalPreview={setShowFinalPreview}
                        onExit={() => undefined}
                    />
                    {showFinalPreview ? (
                        <PreviewModal
                            finalPages={finalPages}
                            files={files}
                            editsByFile={editsByFile}
                            imageFit={optimize.imageFit}
                            matchExportedImages
                            onClose={() => setShowFinalPreview(false)}
                        />
                    ) : null}
                </WorkspaceStoreProvider>
            </PdfCacheProvider>
            {tutorialStep !== null ? (
                <TutorialOverlay
                    currentStep={tutorialStep}
                    onNext={() => undefined}
                    onSkip={() => undefined}
                    onComplete={() => undefined}
                />
            ) : null}
        </div>
    );
}
