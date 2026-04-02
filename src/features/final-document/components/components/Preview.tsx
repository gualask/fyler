import { useMemo } from 'react';
import { PreviewModal } from '@/features/preview';
import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import type { RotationDirection } from '@/shared/domain/file-edits';

interface Props {
    previewTargetId: string | null;
    finalPages: FinalPage[];
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
    onMovePageToIndex: (id: string, targetIndex: number) => void;
    onRotatePage: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    onClose: () => void;
}

export function Preview({
    previewTargetId,
    finalPages,
    files,
    editsByFile,
    onMovePageToIndex,
    onRotatePage,
    onClose,
}: Props) {
    const resolvedPreviewTarget = useMemo(
        () =>
            previewTargetId
                ? (finalPages.find((page) => page.id === previewTargetId) ?? null)
                : null,
        [finalPages, previewTargetId],
    );
    const previewTargetPosition = useMemo(
        () =>
            resolvedPreviewTarget
                ? finalPages.findIndex((page) => page.id === resolvedPreviewTarget.id) + 1
                : 0,
        [finalPages, resolvedPreviewTarget],
    );

    if (!resolvedPreviewTarget) {
        return null;
    }

    return (
        <PreviewModal
            finalPages={[resolvedPreviewTarget]}
            files={files}
            editsByFile={editsByFile}
            indicator={{ current: previewTargetPosition, total: finalPages.length }}
            moveControl={{
                currentPosition: previewTargetPosition,
                totalPositions: finalPages.length,
                onMoveToPosition: (targetIndex) =>
                    onMovePageToIndex(resolvedPreviewTarget.id, targetIndex),
            }}
            onRotatePage={onRotatePage}
            onClose={onClose}
        />
    );
}
