import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getSourceUrl } from '@/infra/platform';
import type { SourceFile } from '@/shared/domain';
import { type ImagePreviewSnapshot, imagePreviewQueryOptions } from './image-preview.cache';

type ImagePreviewFile = Pick<SourceFile, 'id' | 'kind' | 'originalPath'>;

const IDLE_SNAPSHOT: ImagePreviewSnapshot = { src: null, status: 'idle' };
const IDLE_QUERY_INPUT = { fileId: 'idle', originalPath: '' };

export function useImagePreview(file: ImagePreviewFile | undefined) {
    const input =
        file?.kind === 'image' ? { fileId: file.id, originalPath: file.originalPath } : null;
    const sourceUrl = useMemo(
        () => (file?.kind === 'image' ? getSourceUrl(file.originalPath) : null),
        [file?.kind, file?.originalPath],
    );

    const preview = useQuery({
        ...imagePreviewQueryOptions(input ?? IDLE_QUERY_INPUT),
        enabled: Boolean(input),
    });

    if (!input || !sourceUrl) return IDLE_SNAPSHOT;

    if (preview.data?.objectUrl) {
        return { src: preview.data.objectUrl, status: 'ready' };
    }

    if (preview.isError) {
        return { src: sourceUrl, status: 'failed' };
    }

    if (preview.data?.status === 'fallback') {
        return { src: sourceUrl, status: 'fallback' };
    }

    return { src: null, status: 'pending' };
}
