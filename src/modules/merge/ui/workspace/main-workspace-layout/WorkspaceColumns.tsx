import type { SourceFile, SourceTarget } from '@/capabilities/document-sources';
import type { WorkspaceApi } from '@/modules/merge/application';
import { useWorkspaceStoreSelector } from '@/modules/merge/model';
import { OutputPanel } from '@/modules/merge/ui/export';
import { FinalDocument } from '@/modules/merge/ui/final-document';
import { PagePicker } from '@/modules/merge/ui/page-picker';
import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/modules/merge/ui/tutorial';
import { FileList } from '@/modules/merge/ui/workspace';
import type { OptimizeState } from '../main-app.types';
import {
    useFocusedPickerState,
    useWorkspaceFinalPages,
    useWorkspaceSelectedFile,
} from './workspace-layout.hooks';

export function SourceColumn({
    workspace,
    handleAddFiles,
    onPreviewTarget,
}: {
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    onPreviewTarget: (file: SourceFile, target: SourceTarget) => void;
}) {
    const files = useWorkspaceStoreSelector((state) => state.source.files);
    const selectedId = useWorkspaceStoreSelector((state) => state.ui.selectedId);
    const selectedFileScrollKey = useWorkspaceStoreSelector(
        (state) => state.ui.selectedFileScrollKey,
    );
    const editsByFile = useWorkspaceStoreSelector((state) => state.source.editsByFile);
    const selectedFile = useWorkspaceSelectedFile();
    const finalPages = useWorkspaceFinalPages();
    const { focusedSourceTarget, focusedSourceFlashKey } = useFocusedPickerState(selectedFile);

    return (
        <div className="workspace-layout-column workspace-layout-column-source">
            <aside
                {...tutorialTargetProps(TUTORIAL_TARGETS.fileList)}
                className="workspace-surface workspace-surface-source"
            >
                <FileList
                    files={files}
                    selectedId={selectedId}
                    selectedScrollKey={selectedFileScrollKey}
                    onSelect={workspace.selectFile}
                    onRemove={workspace.removeFile}
                    onAddFiles={handleAddFiles}
                    onClearFiles={workspace.clearAllFiles}
                />
            </aside>

            <section
                {...tutorialTargetProps(TUTORIAL_TARGETS.pagePicker)}
                className="workspace-surface workspace-surface-source"
            >
                <PagePicker
                    key={selectedFile?.id}
                    file={selectedFile}
                    finalPages={finalPages}
                    onTogglePage={workspace.togglePage}
                    onSetPdfPages={workspace.setPdfPagesForFile}
                    onSetImageIncluded={workspace.setImageIncluded}
                    onSelectAll={workspace.selectAll}
                    onDeselectAll={workspace.deselectAll}
                    onFocusTarget={workspace.focusFinalPageInDocument}
                    onRotateTarget={workspace.rotatePage}
                    onPreviewTarget={onPreviewTarget}
                    editsByFile={editsByFile}
                    focusedTarget={focusedSourceTarget}
                    focusFlashKey={focusedSourceFlashKey}
                />
            </section>
        </div>
    );
}

export function OutputColumn({
    workspace,
    optimize,
    selectedFinalPageId,
    onPreviewPage,
}: {
    workspace: WorkspaceApi;
    optimize: OptimizeState;
    selectedFinalPageId: string | null;
    onPreviewPage: (id: string) => void;
}) {
    const files = useWorkspaceStoreSelector((state) => state.source.files);
    const editsByFile = useWorkspaceStoreSelector((state) => state.source.editsByFile);
    const focusedSource = useWorkspaceStoreSelector((state) => state.ui.focusedSource);
    const finalPages = useWorkspaceFinalPages();

    return (
        <div className="workspace-layout-column workspace-layout-column-output">
            <section
                {...tutorialTargetProps(TUTORIAL_TARGETS.finalDocument)}
                className="workspace-surface workspace-surface-output"
            >
                <FinalDocument
                    finalPages={finalPages}
                    files={files}
                    imageFit={optimize.imageFit}
                    selectedPageId={selectedFinalPageId}
                    selectedPageScrollKey={
                        focusedSource?.flashTarget === 'final' ? focusedSource.flashKey : undefined
                    }
                    onReorder={workspace.reorderFinalPages}
                    onMovePageToIndex={workspace.moveFinalPageToIndex}
                    onRemove={workspace.removeFinalPage}
                    onSelectPage={workspace.focusFinalPageSource}
                    onPreviewPage={onPreviewPage}
                    editsByFile={editsByFile}
                />
            </section>

            <footer
                {...tutorialTargetProps(TUTORIAL_TARGETS.outputPanel)}
                className="workspace-surface workspace-surface-output"
            >
                <OutputPanel
                    imageFit={optimize.imageFit}
                    jpegQuality={optimize.jpegQuality}
                    targetDpi={optimize.targetDpi}
                    optimizationPreset={optimize.optimizationPreset}
                    onImageFitChange={optimize.setImageFit}
                    onJpegQualityChange={optimize.setJpegQuality}
                    onTargetDpiChange={optimize.setTargetDpi}
                    onOptimizationPresetChange={optimize.setOptimizationPreset}
                />
            </footer>
        </div>
    );
}
