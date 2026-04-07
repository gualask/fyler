import { OutputPanel } from '@/features/export';
import { FinalDocument } from '@/features/final-document';
import { PagePicker } from '@/features/page-picker';
import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/features/tutorial';
import { FileList, type WorkspaceApi } from '@/features/workspace';
import type { OptimizeState } from './main-app.types';

interface Props {
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    focusedSourcePageNum: number | null;
    focusedSourceFlashKey?: number;
    optimize: OptimizeState;
}

export function MainWorkspaceLayout({
    workspace,
    handleAddFiles,
    focusedSourcePageNum,
    focusedSourceFlashKey,
    optimize,
}: Props) {
    return (
        <div
            className="grid min-h-0 flex-1 overflow-hidden"
            style={{
                gridTemplateColumns: 'minmax(320px, 70fr) minmax(260px, 30fr)',
            }}
        >
            <div className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source">
                <div
                    className="grid h-full min-h-0 overflow-hidden"
                    style={{
                        gridTemplateRows: '7.5rem minmax(0, 1fr)',
                    }}
                >
                    <aside
                        {...tutorialTargetProps(TUTORIAL_TARGETS.fileList)}
                        className="min-h-0 overflow-hidden border-b border-ui-border"
                    >
                        <FileList
                            files={workspace.files}
                            selectedId={workspace.selectedId}
                            onSelect={workspace.selectFile}
                            onRemove={workspace.removeFile}
                            onAddFiles={handleAddFiles}
                            onClearFiles={workspace.clearAllFiles}
                        />
                    </aside>

                    <section
                        {...tutorialTargetProps(TUTORIAL_TARGETS.pagePicker)}
                        className="min-h-0 overflow-hidden"
                    >
                        <PagePicker
                            key={workspace.selectedFile?.id}
                            file={workspace.selectedFile}
                            finalPages={workspace.finalPages}
                            onTogglePage={workspace.togglePage}
                            onSetPages={workspace.setPagesForFile}
                            onSelectAll={workspace.selectAll}
                            onDeselectAll={workspace.deselectAll}
                            onFocusPage={workspace.focusFinalPageInDocument}
                            onRotatePage={workspace.rotatePage}
                            editsByFile={workspace.editsByFile}
                            focusedPageNum={focusedSourcePageNum}
                            focusFlashKey={focusedSourceFlashKey}
                        />
                    </section>
                </div>
            </div>

            <div className="min-w-0 overflow-hidden bg-ui-output">
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    <section
                        {...tutorialTargetProps(TUTORIAL_TARGETS.finalDocument)}
                        className="min-h-0 flex-1 overflow-hidden"
                    >
                        <FinalDocument
                            finalPages={workspace.finalPages}
                            files={workspace.files}
                            selectedPageId={
                                workspace.focusedSource
                                    ? `${workspace.focusedSource.fileId}:${workspace.focusedSource.pageNum}`
                                    : null
                            }
                            selectedPageScrollKey={
                                workspace.focusedSource?.flashTarget === 'final'
                                    ? workspace.focusedSource.flashKey
                                    : undefined
                            }
                            onReorder={workspace.reorderFinalPages}
                            onMovePageToIndex={workspace.moveFinalPageToIndex}
                            onRemove={workspace.removeFinalPage}
                            onSelectPage={workspace.focusFinalPageSource}
                            onRotatePage={workspace.rotatePage}
                            editsByFile={workspace.editsByFile}
                        />
                    </section>

                    <footer className="shrink-0 border-t border-ui-border bg-ui-surface">
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
        </div>
    );
}
