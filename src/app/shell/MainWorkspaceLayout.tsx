import { AnimatePresence } from 'motion/react';
import { useMemo, useState } from 'react';
import { OutputPanel } from '@/features/export';
import { FinalDocument } from '@/features/final-document';
import { PagePicker } from '@/features/page-picker';
import { PreviewModal } from '@/features/preview';
import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/features/tutorial';
import { FileList, type WorkspaceApi } from '@/features/workspace';
import type { FinalPage, SourceFile, SourceTarget } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import type { OptimizeState } from './main-app.types';

interface Props {
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    focusedSourceTarget: SourceTarget | null;
    focusedSourceFlashKey?: number;
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
    focusedSourceTarget: SourceTarget | null;
    focusedSourceFlashKey?: number;
    onPreviewTarget: (file: SourceFile, target: SourceTarget) => void;
};

type OutputColumnProps = {
    workspace: WorkspaceApi;
    optimize: OptimizeState;
    selectedFinalPageId: string | null;
    onPreviewPage: (id: string) => void;
};

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

    return (
        <AnimatePresence>
            {target && page ? (
                <PreviewModal
                    key={page.id}
                    finalPages={[page]}
                    files={[target.file]}
                    editsByFile={workspace.editsByFile}
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
    const target = useMemo(
        () =>
            targetId ? (workspace.finalPages.find((page) => page.id === targetId) ?? null) : null,
        [targetId, workspace.finalPages],
    );
    const position = target
        ? workspace.finalPages.findIndex((page) => page.id === target.id) + 1
        : 0;

    return (
        <AnimatePresence>
            {target ? (
                <PreviewModal
                    key={target.id}
                    finalPages={[target]}
                    files={workspace.files}
                    imageFit={imageFit}
                    matchExportedImages
                    editsByFile={workspace.editsByFile}
                    indicator={{
                        current: position,
                        total: workspace.finalPages.length,
                    }}
                    moveControl={{
                        currentPosition: position,
                        totalPositions: workspace.finalPages.length,
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

function SourceColumn({
    workspace,
    handleAddFiles,
    focusedSourceTarget,
    focusedSourceFlashKey,
    onPreviewTarget,
}: SourceColumnProps) {
    return (
        <div className="workspace-layout-column workspace-layout-column-source">
            <aside
                {...tutorialTargetProps(TUTORIAL_TARGETS.fileList)}
                className="workspace-surface workspace-surface-source"
            >
                <FileList
                    files={workspace.files}
                    selectedId={workspace.selectedId}
                    selectedScrollKey={workspace.selectedFileScrollKey}
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
                    key={workspace.selectedFile?.id}
                    file={workspace.selectedFile}
                    finalPages={workspace.finalPages}
                    onTogglePage={workspace.togglePage}
                    onSetPdfPages={workspace.setPdfPagesForFile}
                    onSetImageIncluded={workspace.setImageIncluded}
                    onSelectAll={workspace.selectAll}
                    onDeselectAll={workspace.deselectAll}
                    onFocusTarget={workspace.focusFinalPageInDocument}
                    onRotateTarget={workspace.rotatePage}
                    onPreviewTarget={onPreviewTarget}
                    editsByFile={workspace.editsByFile}
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
    return (
        <div className="workspace-layout-column workspace-layout-column-output">
            <section
                {...tutorialTargetProps(TUTORIAL_TARGETS.finalDocument)}
                className="workspace-surface workspace-surface-output"
            >
                <FinalDocument
                    finalPages={workspace.finalPages}
                    files={workspace.files}
                    imageFit={optimize.imageFit}
                    selectedPageId={selectedFinalPageId}
                    selectedPageScrollKey={
                        workspace.focusedSource?.flashTarget === 'final'
                            ? workspace.focusedSource.flashKey
                            : undefined
                    }
                    onReorder={workspace.reorderFinalPages}
                    onMovePageToIndex={workspace.moveFinalPageToIndex}
                    onRemove={workspace.removeFinalPage}
                    onSelectPage={workspace.focusFinalPageSource}
                    onPreviewPage={onPreviewPage}
                    editsByFile={workspace.editsByFile}
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

export function MainWorkspaceLayout({
    workspace,
    handleAddFiles,
    focusedSourceTarget,
    focusedSourceFlashKey,
    optimize,
}: Props) {
    const [pickerPreviewTarget, setPickerPreviewTarget] = useState<PickerPreviewTarget | null>(
        null,
    );
    const [finalDocumentPreviewTargetId, setFinalDocumentPreviewTargetId] = useState<string | null>(
        null,
    );
    const selectedFinalPageId = workspace.focusedSource
        ? toFinalPageId(workspace.focusedSource.fileId, workspace.focusedSource.target)
        : null;

    return (
        <>
            <div className="workspace-layout-grid">
                <SourceColumn
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    focusedSourceTarget={focusedSourceTarget}
                    focusedSourceFlashKey={focusedSourceFlashKey}
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
