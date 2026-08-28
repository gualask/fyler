import { AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import type { SourceFile, SourceTarget } from '@/capabilities/document-sources';
import type { WorkspaceApi } from '@/modules/merge/application';
import type { FinalPage, ImageFit } from '@/modules/merge/model';
import { toFinalPageId, useWorkspaceStoreSelector } from '@/modules/merge/model';
import { PreviewModal } from '@/modules/merge/ui/preview';
import { useWorkspaceFinalPages } from './workspace-layout.hooks';

export type PickerPreviewTarget = {
    file: SourceFile;
    target: SourceTarget;
};

function toPreviewFinalPage(file: SourceFile, target: SourceTarget): FinalPage {
    return target.kind === 'image'
        ? { id: toFinalPageId(file.id, target), fileId: file.id, kind: 'image' }
        : {
              id: toFinalPageId(file.id, target),
              fileId: file.id,
              kind: 'pdf',
              pageNum: target.pageNum,
          };
}

export function PickerPreview({
    target,
    workspace,
    imageFit,
    onClose,
}: {
    target: PickerPreviewTarget | null;
    workspace: WorkspaceApi;
    imageFit: ImageFit;
    onClose: () => void;
}) {
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
                        total: target.file.kind === 'pdf' ? (target.file.pageCount ?? 1) : 1,
                        mode: 'page-num',
                    }}
                    onRotatePage={workspace.rotatePage}
                    onClose={onClose}
                />
            ) : null}
        </AnimatePresence>
    );
}

export function FinalDocumentPreview({
    targetId,
    workspace,
    imageFit,
    onClose,
}: {
    targetId: string | null;
    workspace: WorkspaceApi;
    imageFit: ImageFit;
    onClose: () => void;
}) {
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
                    indicator={{ current: position, total: finalPages.length }}
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
