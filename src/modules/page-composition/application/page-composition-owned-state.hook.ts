import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { SourceFile } from '@/capabilities/document-sources';
import { useDocumentSourcesPort } from '@/capabilities/document-sources/source.port';
import { usePdfCache } from '@/infrastructure/pdfjs';
import {
    type CompositionSource,
    EMPTY_PAGE_COMPOSITION,
    ownedSourceIds,
    type PageComposition,
    type PageCompositionAction,
    pageCompositionReducer,
    releasedSourceIds,
} from '../model';

function filesForSource(source: CompositionSource | null): SourceFile[] {
    if (!source) return [];
    return source.kind === 'image' ? [source.file] : [source.file, source.rasterFile];
}

function ownedFiles(composition: PageComposition): SourceFile[] {
    const files = [
        ...filesForSource(composition.regions.top.source),
        ...filesForSource(composition.regions.bottom.source),
    ];
    return [...new Map(files.map((file) => [file.id, file])).values()];
}

export function useOwnedComposition() {
    const documentSources = useDocumentSourcesPort();
    const pdfCache = usePdfCache();
    const [composition, dispatch] = useReducer(pageCompositionReducer, EMPTY_PAGE_COMPOSITION);
    const compositionRef = useRef(composition);
    compositionRef.current = composition;
    const releaseFiles = useCallback(
        (files: SourceFile[]) => {
            if (files.length === 0) return;
            for (const file of files) {
                if (file.kind === 'pdf') pdfCache.releaseFile(file.id);
            }
            void documentSources.releaseSources(files.map((file) => file.id));
        },
        [documentSources, pdfCache],
    );
    const releaseFilesRef = useRef(releaseFiles);
    releaseFilesRef.current = releaseFiles;
    const commit = useCallback(
        (action: PageCompositionAction) => {
            const before = compositionRef.current;
            const after = pageCompositionReducer(before, action);
            const released = new Set(releasedSourceIds(before, after));
            releaseFiles(ownedFiles(before).filter((file) => released.has(file.id)));
            compositionRef.current = after;
            dispatch(action);
        },
        [releaseFiles],
    );
    const discardComposition = useCallback(() => {
        const files = ownedFiles(compositionRef.current);
        compositionRef.current = EMPTY_PAGE_COMPOSITION;
        dispatch({ type: 'reset' });
        releaseFiles(files);
    }, [releaseFiles]);
    useEffect(
        () => () => {
            const files = ownedFiles(compositionRef.current);
            compositionRef.current = EMPTY_PAGE_COMPOSITION;
            releaseFilesRef.current(files);
        },
        [],
    );
    return { composition, compositionRef, commit, releaseFiles, discardComposition };
}

export function hasOwnedCompositionSources(composition: PageComposition): boolean {
    return ownedSourceIds(composition).length > 0;
}
