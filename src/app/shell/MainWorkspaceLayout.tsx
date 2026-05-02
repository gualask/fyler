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
    const pickerPreviewPage = pickerPreviewTarget
        ? toPreviewFinalPage(pickerPreviewTarget.file, pickerPreviewTarget.target)
        : null;
    const finalDocumentPreviewTarget = useMemo(
        () =>
            finalDocumentPreviewTargetId
                ? (workspace.finalPages.find((page) => page.id === finalDocumentPreviewTargetId) ??
                  null)
                : null,
        [finalDocumentPreviewTargetId, workspace.finalPages],
    );
    const finalDocumentPreviewPosition = finalDocumentPreviewTarget
        ? workspace.finalPages.findIndex((page) => page.id === finalDocumentPreviewTarget.id) + 1
        : 0;

    return (
        <>
            <div className="workspace-layout-grid">
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
                            onPreviewTarget={(file, target) =>
                                setPickerPreviewTarget({ file, target })
                            }
                            editsByFile={workspace.editsByFile}
                            focusedTarget={focusedSourceTarget}
                            focusFlashKey={focusedSourceFlashKey}
                        />
                    </section>
                </div>

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
                            onPreviewPage={setFinalDocumentPreviewTargetId}
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
            </div>

            <AnimatePresence>
                {pickerPreviewTarget && pickerPreviewPage && (
                    <PreviewModal
                        key={pickerPreviewPage.id}
                        finalPages={[pickerPreviewPage]}
                        files={[pickerPreviewTarget.file]}
                        editsByFile={workspace.editsByFile}
                        imageFit={optimize.imageFit}
                        matchExportedImages
                        indicator={{
                            total:
                                pickerPreviewTarget.file.kind === 'pdf'
                                    ? (pickerPreviewTarget.file.pageCount ?? 1)
                                    : 1,
                            mode: 'page-num',
                        }}
                        onRotatePage={workspace.rotatePage}
                        onClose={() => setPickerPreviewTarget(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {finalDocumentPreviewTarget && (
                    <PreviewModal
                        key={finalDocumentPreviewTarget.id}
                        finalPages={[finalDocumentPreviewTarget]}
                        files={workspace.files}
                        imageFit={optimize.imageFit}
                        matchExportedImages
                        editsByFile={workspace.editsByFile}
                        indicator={{
                            current: finalDocumentPreviewPosition,
                            total: workspace.finalPages.length,
                        }}
                        moveControl={{
                            currentPosition: finalDocumentPreviewPosition,
                            totalPositions: workspace.finalPages.length,
                            onMoveToPosition: (targetIndex) =>
                                workspace.moveFinalPageToIndex(
                                    finalDocumentPreviewTarget.id,
                                    targetIndex,
                                ),
                        }}
                        onRotatePage={workspace.rotatePage}
                        onClose={() => setFinalDocumentPreviewTargetId(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
