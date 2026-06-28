import { AnimatePresence } from 'motion/react';
import { useMemo, useState } from 'react';
import { OutputPanel } from '@/features/export';
import { FinalDocument } from '@/features/final-document';
import { PagePicker } from '@/features/page-picker';
import { PreviewModal } from '@/features/preview';
import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/features/tutorial';
import {
    FileList,
    fromFinalPageId,
    useWorkspaceStoreSelector,
    type WorkspaceApi,
} from '@/features/workspace';
import type { FinalPage, SourceFile, SourceTarget } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { deriveFocusedSourceState } from '../app-content.selectors';
import type { OptimizeState } from './main-app.types';

interface Props {
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    optimize: OptimizeState;
}

type PickerPreviewTarget = {
    file: SourceFile;
    target: SourceTarget;
};

type PickerPreviewProps = {
    target: PickerPreviewTarget | null;
    workspace: WorkspaceApi;
    imageFit: OptimizeState['imageFit'];
    onClose: () => void;
};

type FinalDocumentPreviewProps = {
    targetId: string | null;
    workspace: WorkspaceApi;
    imageFit: OptimizeState['imageFit'];
    onClose: () => void;
};

type SourceColumnProps = {
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    onPreviewTarget: (file: SourceFile, target: SourceTarget) => void;
};

type OutputColumnProps = {
    workspace: WorkspaceApi;
    optimize: OptimizeState;
    selectedFinalPageId: string | null;
    onPreviewPage: (id: string) => void;
};

function useWorkspaceFinalPages(): FinalPage[] {
    const pageOrder = useWorkspaceStoreSelector((state) => state.composition.pageOrder);
    return useMemo<FinalPage[]>(
        () => pageOrder.map((id) => ({ id, ...fromFinalPageId(id) })),
        [pageOrder],
    );
}

function useWorkspaceSelectedFile() {
    const files = useWorkspaceStoreSelector((state) => state.source.files);
    const selectedId = useWorkspaceStoreSelector((state) => state.ui.selectedId);

    return useMemo(() => files.find((file) => file.id === selectedId) ?? null, [files, selectedId]);
}

function useFocusedPickerState(selectedFile: SourceFile | null) {
    const focusedSource = useWorkspaceStoreSelector((state) => state.ui.focusedSource);
    return deriveFocusedSourceState({ focusedSource, selectedFile });
}

function toPreviewFinalPage(file: SourceFile, target: SourceTarget): FinalPage {
    return target.kind === 'image'
        ? {
              id: toFinalPageId(file.id, target),
              fileId: file.id,
              kind: 'image',
          }
        : {
              id: toFinalPageId(file.id, target),
              fileId: file.id,
              kind: 'pdf',
              pageNum: target.pageNum,
          };
}

function getPickerPreviewTotal(file: SourceFile): number {
    return file.kind === 'pdf' ? (file.pageCount ?? 1) : 1;
}

function PickerPreview({ target, workspace, imageFit, onClose }: PickerPreviewProps) {
    const page = target ? toPreviewFinalPage(target.file, target.target) : null;
    const editsByFile = useWorkspaceStoreSelector((state) => state.source.editsByFile);

    return (
        <AnimatePresence>
            {target && page ? (
                <PreviewModal
                    key={page.id}
                    finalPages={[page]}
                    files={[target.file]}
                    editsByFile={editsByFile}
                    imageFit={imageFit}
                    matchExportedImages
                    indicator={{
                        total: getPickerPreviewTotal(target.file),
                        mode: 'page-num',
                    }}
                    onRotatePage={workspace.rotatePage}
                    onClose={onClose}
                />
            ) : null}
        </AnimatePresence>
    );
}

function FinalDocumentPreview({
    targetId,
    workspace,
    imageFit,
    onClose,
}: FinalDocumentPreviewProps) {
    const files = useWorkspaceStoreSelector((state) => state.source.files);
    const editsByFile = useWorkspaceStoreSelector((state) => state.source.editsByFile);
    const finalPages = useWorkspaceFinalPages();
    const target = useMemo(
        () => (targetId ? (finalPages.find((page) => page.id === targetId) ?? null) : null),
        [finalPages, targetId],
    );
    const position = target ? finalPages.findIndex((page) => page.id === target.id) + 1 : 0;

    return (
        <AnimatePresence>
            {target ? (
                <PreviewModal
                    key={target.id}
                    finalPages={[target]}
                    files={files}
                    imageFit={imageFit}
                    matchExportedImages
                    editsByFile={editsByFile}
                    indicator={{
                        current: position,
                        total: finalPages.length,
                    }}
                    moveControl={{
                        currentPosition: position,
                        totalPositions: finalPages.length,
                        onMoveToPosition: (targetIndex) =>
                            workspace.moveFinalPageToIndex(target.id, targetIndex),
                    }}
                    onRotatePage={workspace.rotatePage}
                    onClose={onClose}
                />
            ) : null}
        </AnimatePresence>
    );
}

function SourceColumn({ workspace, handleAddFiles, onPreviewTarget }: SourceColumnProps) {
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

function OutputColumn({
    workspace,
    optimize,
    selectedFinalPageId,
    onPreviewPage,
}: OutputColumnProps) {
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

export function MainWorkspaceLayout({ workspace, handleAddFiles, optimize }: Props) {
    const [pickerPreviewTarget, setPickerPreviewTarget] = useState<PickerPreviewTarget | null>(
        null,
    );
    const [finalDocumentPreviewTargetId, setFinalDocumentPreviewTargetId] = useState<string | null>(
        null,
    );
    const focusedSource = useWorkspaceStoreSelector((state) => state.ui.focusedSource);
    const selectedFinalPageId = focusedSource
        ? toFinalPageId(focusedSource.fileId, focusedSource.target)
        : null;

    return (
        <>
            <div className="workspace-layout-grid">
                <SourceColumn
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    onPreviewTarget={(file, target) => setPickerPreviewTarget({ file, target })}
                />
                <OutputColumn
                    workspace={workspace}
                    optimize={optimize}
                    selectedFinalPageId={selectedFinalPageId}
                    onPreviewPage={setFinalDocumentPreviewTargetId}
                />
            </div>

            <PickerPreview
                target={pickerPreviewTarget}
                workspace={workspace}
                imageFit={optimize.imageFit}
                onClose={() => setPickerPreviewTarget(null)}
            />
            <FinalDocumentPreview
                targetId={finalDocumentPreviewTargetId}
                workspace={workspace}
                imageFit={optimize.imageFit}
                onClose={() => setFinalDocumentPreviewTargetId(null)}
            />
        </>
    );
}
