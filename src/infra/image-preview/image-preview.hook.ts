import { useEffect, useMemo, useState } from 'react';
import { getSourceUrl } from '@/infra/platform';
import type { SourceFile } from '@/shared/domain';
import {
    type ImagePreviewSnapshot,
    type ImagePreviewStatus,
    retainImagePreview,
} from './image-preview.cache';

type ImagePreviewFile = Pick<SourceFile, 'id' | 'kind' | 'originalPath'>;

const IDLE_SNAPSHOT: ImagePreviewSnapshot = { src: null, status: 'idle' };

export function useImagePreview(file: ImagePreviewFile | undefined) {
    const key = file?.kind === 'image' ? `${file.id}:${file.originalPath}` : null;
    const sourceUrl = useMemo(
        () => (file?.kind === 'image' ? getSourceUrl(file.originalPath) : null),
        [file?.kind, file?.originalPath],
    );
    const [snapshot, setSnapshot] = useState<ImagePreviewSnapshot>(IDLE_SNAPSHOT);

    useEffect(() => {
        if (!key || file?.kind !== 'image' || !sourceUrl) {
            setSnapshot(IDLE_SNAPSHOT);
            return;
        }

        const subscription = retainImagePreview({ key, fileId: file.id, sourceUrl }, () =>
            setSnapshot(subscription.getSnapshot()),
        );
        setSnapshot(subscription.getSnapshot());

        return () => {
            subscription.release();
        };
    }, [file?.id, file?.kind, key, sourceUrl]);

    return snapshot;
}

export type { ImagePreviewStatus };
