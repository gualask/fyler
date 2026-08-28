import { type Dispatch, type RefObject, type SetStateAction, useCallback, useState } from 'react';

import type {
    OpenFilesResult,
    PasswordProtectedFile,
    SourceFile,
} from '@/capabilities/document-sources';
import {
    type DocumentSourcesPort,
    useDocumentSourcesPort,
} from '@/capabilities/document-sources/source.port';
import { usePdfCache } from '@/infrastructure/pdfjs';
import { useTranslation } from '@/shared/i18n';
import {
    type CompositionRegionKey,
    ownedSourceIds,
    type PageComposition,
    type PageCompositionAction,
} from '../model';
import { useCompositionFileDrop } from './composition-file-drop.hook';
import {
    type PageCompositionNotifications,
    type PageCompositionPort,
    usePageCompositionPort,
} from './page-composition.port';
import { limitCompositionDropPaths } from './page-composition-drop-policy';
import { rasterizePdfPage } from './pdf-page-raster';

type PickerState = {
    region: CompositionRegionKey;
    file: SourceFile;
    newlyImported: boolean;
};

type PasswordState = { region: CompositionRegionKey; file: PasswordProtectedFile };

type AcquisitionContext = {
    notifications: PageCompositionNotifications;
    compositionRef: RefObject<PageComposition>;
    documentSources: DocumentSourcesPort;
    compositionPort: PageCompositionPort;
    pdfCache: ReturnType<typeof usePdfCache>;
    commit: (action: PageCompositionAction) => void;
    releaseFiles: (files: SourceFile[]) => void;
    focusRegion: (region: CompositionRegionKey) => void;
    setStatus: Dispatch<SetStateAction<string>>;
};

function resolveImportResult(result: OpenFilesResult) {
    const file = result.files[0];
    if (file) {
        return {
            candidate: { kind: 'source' as const, file },
            unusedFiles: result.files.slice(1),
            unusedProtectedPaths: result.passwordRequired.map((item) => item.originalPath),
        };
    }
    const protectedFile = result.passwordRequired[0];
    if (protectedFile) {
        return {
            candidate: { kind: 'password' as const, file: protectedFile },
            unusedFiles: [],
            unusedProtectedPaths: result.passwordRequired.slice(1).map((item) => item.originalPath),
        };
    }
    return {
        candidate: { kind: 'empty' as const },
        unusedFiles: [],
        unusedProtectedPaths: [],
    };
}

async function applyImportResult(
    context: AcquisitionContext,
    pdfResolution: ReturnType<typeof usePdfSourceResolution>,
    region: CompositionRegionKey,
    result: OpenFilesResult,
) {
    const resolution = resolveImportResult(result);
    context.releaseFiles(resolution.unusedFiles);
    if (resolution.unusedProtectedPaths.length > 0) {
        await context.documentSources.discardPendingSources(resolution.unusedProtectedPaths);
    }
    if (resolution.candidate.kind === 'password') {
        pdfResolution.requestPassword({ region, file: resolution.candidate.file });
        return;
    }
    if (resolution.candidate.kind === 'empty') {
        context.focusRegion(region);
        return;
    }
    const { file } = resolution.candidate;
    if (file.kind !== 'image') {
        pdfResolution.requestPage({ region, file, newlyImported: true });
        return;
    }
    context.commit({ type: 'assign', region, source: { kind: 'image', file } });
    context.focusRegion(region);
}

function usePdfSourceResolution(
    context: AcquisitionContext,
    messages: { rasterizing: string; ready: string; error: string },
) {
    const {
        compositionRef,
        documentSources,
        compositionPort,
        pdfCache,
        commit,
        releaseFiles,
        focusRegion,
        notifications,
        setStatus,
    } = context;
    const [picker, setPicker] = useState<PickerState | null>(null);
    const [password, setPassword] = useState<PasswordState | null>(null);
    const cancelPicker = useCallback(() => {
        if (!picker) return;
        if (
            picker.newlyImported &&
            !ownedSourceIds(compositionRef.current).includes(picker.file.id)
        ) {
            releaseFiles([picker.file]);
        }
        const region = picker.region;
        setPicker(null);
        focusRegion(region);
    }, [compositionRef, focusRegion, picker, releaseFiles]);
    const confirmPdfPage = useCallback(
        async (pageNum: number) => {
            if (!picker) return;
            try {
                setStatus(messages.rasterizing);
                const document = await pdfCache.getPdfDocument(picker.file);
                const bytes = await rasterizePdfPage(document, pageNum);
                const rasterFile = await compositionPort.registerPdfPageRaster(bytes);
                commit({
                    type: 'assign',
                    region: picker.region,
                    source: { kind: 'pdf-page', file: picker.file, pageNum, rasterFile },
                });
                const region = picker.region;
                setPicker(null);
                setStatus(messages.ready);
                focusRegion(region);
            } catch (error) {
                notifications.showError(error);
                setStatus(messages.error);
                throw error;
            }
        },
        [
            commit,
            compositionPort,
            focusRegion,
            messages,
            notifications,
            pdfCache,
            picker,
            setStatus,
        ],
    );
    const unlockPdf = useCallback(
        async (enteredPassword: string) => {
            if (!password) return false;
            try {
                const source = await documentSources.unlockPdfSource(
                    password.file.originalPath,
                    enteredPassword,
                );
                pdfCache.setPdfPassword(source.id, enteredPassword);
                setPicker({ region: password.region, file: source, newlyImported: true });
                setPassword(null);
                return true;
            } catch {
                return false;
            }
        },
        [documentSources, password, pdfCache],
    );
    const cancelPassword = useCallback(() => {
        if (!password) return;
        void documentSources.discardPendingSources([password.file.originalPath]);
        const region = password.region;
        setPassword(null);
        focusRegion(region);
    }, [documentSources, focusRegion, password]);
    return {
        picker,
        password,
        requestPage: setPicker,
        requestPassword: setPassword,
        cancelPicker,
        confirmPdfPage,
        unlockPdf,
        cancelPassword,
    };
}

function useSourceImport(
    context: AcquisitionContext,
    pdfResolution: ReturnType<typeof usePdfSourceResolution>,
    filterLabel: string,
) {
    const { notifications, documentSources, focusRegion } = context;
    const importIntoRegion = useCallback(
        async (region: CompositionRegionKey, openFiles: () => Promise<OpenFilesResult>) => {
            if (!notifications.beginOpeningFiles()) return;
            try {
                await applyImportResult(context, pdfResolution, region, await openFiles());
            } catch (error) {
                notifications.showError(error);
                focusRegion(region);
            } finally {
                notifications.finishOpeningFiles();
            }
        },
        [context, focusRegion, notifications, pdfResolution],
    );

    const chooseSource = useCallback(
        (region: CompositionRegionKey) =>
            importIntoRegion(region, () => documentSources.openFilesDialog(filterLabel)),
        [documentSources, filterLabel, importIntoRegion],
    );
    const importDroppedFiles = useCallback(
        (region: CompositionRegionKey, paths: string[]) =>
            importIntoRegion(region, () =>
                documentSources.openFilesFromPaths(limitCompositionDropPaths(paths)),
            ),
        [documentSources, importIntoRegion],
    );
    return { chooseSource, importDroppedFiles };
}

export function usePageCompositionSourceAcquisition({
    notifications,
    compositionRef,
    regionRefs,
    commit,
    releaseFiles,
    focusRegion,
    setStatus,
    dropDisabled,
}: {
    notifications: PageCompositionNotifications;
    compositionRef: RefObject<PageComposition>;
    regionRefs: Record<CompositionRegionKey, RefObject<HTMLElement | null>>;
    commit: (action: PageCompositionAction) => void;
    releaseFiles: (files: SourceFile[]) => void;
    focusRegion: (region: CompositionRegionKey) => void;
    setStatus: Dispatch<SetStateAction<string>>;
    dropDisabled: boolean;
}) {
    const { t } = useTranslation();
    const documentSources = useDocumentSourcesPort();
    const compositionPort = usePageCompositionPort();
    const pdfCache = usePdfCache();
    const context = {
        notifications,
        compositionRef,
        documentSources,
        compositionPort,
        pdfCache,
        commit,
        releaseFiles,
        focusRegion,
        setStatus,
    };
    const pdfResolution = usePdfSourceResolution(context, {
        rasterizing: t('pageComposition.rasterizing'),
        ready: t('pageComposition.sourceReady'),
        error: t('pageComposition.rasterError'),
    });
    const sourceImport = useSourceImport(
        context,
        pdfResolution,
        t('dialogs.filters.documentsAndImages'),
    );
    const dragRegion = useCompositionFileDrop({
        enabled:
            !notifications.isBusy &&
            !pdfResolution.picker &&
            !pdfResolution.password &&
            !dropDisabled,
        listen: documentSources.listenForFileDrag,
        regionRefs,
        onDrop: (region, paths) => void sourceImport.importDroppedFiles(region, paths),
    });

    return {
        picker: pdfResolution.picker,
        password: pdfResolution.password,
        dragRegion,
        chooseSource: sourceImport.chooseSource,
        cancelPicker: pdfResolution.cancelPicker,
        confirmPdfPage: pdfResolution.confirmPdfPage,
        unlockPdf: pdfResolution.unlockPdf,
        cancelPassword: pdfResolution.cancelPassword,
    };
}
