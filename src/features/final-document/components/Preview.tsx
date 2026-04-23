import { AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { PreviewModal } from '@/features/preview';
import type {
    FileEdits,
    FinalPage,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';

interface Props {
    previewTargetId: string | null;
    finalPages: FinalPage[];
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
    onMovePageToIndex: (id: string, targetIndex: number) => void;
    onRotatePage: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => Promise<void>;
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

    return (
        <AnimatePresence>
            {resolvedPreviewTarget && (
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
            )}
        </AnimatePresence>
    );
}
