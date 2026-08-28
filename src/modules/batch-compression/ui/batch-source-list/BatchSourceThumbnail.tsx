import { IconFile, IconFileTypePdf, IconPhoto } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';

import { useImagePreview } from '@/capabilities/document-preview';
import type { SourceFile } from '@/capabilities/document-sources';
import { useLazyPdfRender, usePdfCache } from '@/infrastructure/pdfjs';
import { BATCH_IMAGE_PREVIEW_LONG_SIDE, type BatchSource } from '../../model';

const BATCH_THUMBNAIL_WIDTH = 64;
const BATCH_THUMBNAIL_DENSITY =
    typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

function SourceIcon({ source }: { source: BatchSource }) {
    const color =
        source.kind === 'pdf'
            ? 'text-ui-kind-pdf'
            : source.kind === 'image'
              ? 'text-ui-kind-image'
              : 'text-ui-text-muted';
    if (source.kind === 'pdf')
        return <IconFileTypePdf className={`h-5 w-5 ${color}`} aria-hidden="true" />;
    if (source.kind === 'image')
        return <IconPhoto className={`h-5 w-5 ${color}`} aria-hidden="true" />;
    return <IconFile className={`h-5 w-5 ${color}`} aria-hidden="true" />;
}

function previewFile(source: BatchSource): SourceFile | undefined {
    if (source.kind === 'unsupported') return undefined;
    return {
        id: source.id,
        originalPath: source.path,
        name: source.name,
        byteSize: source.pickedOriginalBytes,
        pageCount: null,
        kind: source.kind,
    };
}

export function BatchSourceThumbnail({
    source,
    scrollRoot,
}: {
    source: BatchSource;
    scrollRoot: HTMLUListElement | null;
}) {
    const file = useMemo(() => previewFile(source), [source]);
    const pdfRequest = useMemo(
        () =>
            source.kind === 'pdf'
                ? {
                      pageNum: 1,
                      quarterTurns: 0 as const,
                      variant: 'thumb' as const,
                      width: BATCH_THUMBNAIL_WIDTH,
                      quality: 0.86,
                      density: BATCH_THUMBNAIL_DENSITY,
                  }
                : null,
        [source.kind],
    );
    const { releaseFile } = usePdfCache();
    const { dataUrl, isNearViewport, setTargetEl } = useLazyPdfRender(
        file?.kind === 'pdf' ? file : undefined,
        pdfRequest,
        scrollRoot,
    );
    const imagePreview = useImagePreview(file?.kind === 'image' ? file : undefined, {
        enabled: isNearViewport,
        maxSide: BATCH_IMAGE_PREVIEW_LONG_SIDE,
    });
    const previewUrl = source.kind === 'pdf' ? dataUrl : imagePreview.src;

    useEffect(
        () => () => {
            if (source.kind === 'pdf') releaseFile(source.id);
        },
        [releaseFile, source.id, source.kind],
    );

    return (
        <span
            ref={setTargetEl}
            className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-ui-border bg-ui-surface-hover"
        >
            {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-contain" />
            ) : isNearViewport && source.kind !== 'unsupported' ? (
                <span className="h-7 w-6 animate-pulse rounded-sm bg-ui-border motion-reduce:animate-none" />
            ) : (
                <SourceIcon source={source} />
            )}
        </span>
    );
}
