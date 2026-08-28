import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import { type ImagePreviewSnapshot, imagePreviewQueryOptions } from './image-preview.cache';
import { useDocumentPreviewPort } from './preview.port';
import type { ImagePreviewRequest } from './preview.types';

type ImagePreviewFile = Pick<SourceFile, 'id' | 'kind' | 'originalPath'>;

const IDLE_SNAPSHOT: ImagePreviewSnapshot = { src: null, status: 'idle' };
const IDLE_QUERY_INPUT = { fileId: 'idle', originalPath: '' };

export function usePrefetchImagePreview() {
    const documentPreview = useDocumentPreviewPort();
    const queryClient = useQueryClient();
    return useCallback(
        async (input: ImagePreviewRequest) => {
            await queryClient.fetchQuery(imagePreviewQueryOptions(input, documentPreview));
        },
        [documentPreview, queryClient],
    );
}

export function useImagePreview(
    file: ImagePreviewFile | undefined,
    options: { enabled?: boolean; maxSide?: number } = {},
) {
    const documentPreview = useDocumentPreviewPort();
    const enabled = options.enabled ?? true;
    const input =
        file?.kind === 'image'
            ? {
                  fileId: file.id,
                  originalPath: file.originalPath,
                  maxSide: options.maxSide,
              }
            : null;
    const sourceUrl = useMemo(
        () => (file?.kind === 'image' ? documentPreview.getSourceUrl(file.originalPath) : null),
        [documentPreview, file?.kind, file?.originalPath],
    );

    const preview = useQuery({
        ...imagePreviewQueryOptions(input ?? IDLE_QUERY_INPUT, documentPreview),
        enabled: Boolean(input) && enabled,
    });

    if (!input || !sourceUrl || !enabled) return IDLE_SNAPSHOT;

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
