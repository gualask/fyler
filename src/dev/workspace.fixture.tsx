import { useCallback, useMemo, useState } from 'react';

import { MainAppView } from '@/app/shell/MainAppView';
import type { OptimizeState } from '@/app/shell/main-app.types';
import type { WorkspaceApi } from '@/features/workspace';
import { PdfCacheProvider } from '@/infra/pdf';
import type {
    FileEdits,
    FinalPage,
    ImageFit,
    ImageOptimizationPreset,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import {
    DEFAULT_OPTIMIZATION_PRESET,
    getOptimizationSettings,
} from '@/shared/domain/value-objects/optimization-presets.vo';
import { useTheme } from '@/shared/preferences';

export function WorkspaceFixturePage({
    createInitialFiles,
    initialSelectedId = null,
    initialFinalPages,
    initialEditsByFile,
}: {
    createInitialFiles: () => SourceFile[];
    initialSelectedId?: string | null;
    initialFinalPages?: FinalPage[] | (() => FinalPage[]);
    initialEditsByFile?: Record<string, FileEdits> | (() => Record<string, FileEdits>);
}) {
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const [files, setFiles] = useState(createInitialFiles);
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
    const [finalPages, setFinalPages] = useState<FinalPage[]>(
        () =>
            (typeof initialFinalPages === 'function' ? initialFinalPages() : initialFinalPages) ??
            [],
    );
    const [editsByFile, setEditsByFile] = useState<Record<string, FileEdits>>(
        () =>
            (typeof initialEditsByFile === 'function'
                ? initialEditsByFile()
                : initialEditsByFile) ?? {},
    );
    const [imageFit, setImageFit] = useState<ImageFit>('contain');
    const defaultOptimization = getOptimizationSettings(DEFAULT_OPTIMIZATION_PRESET);
    const [jpegQuality, setJpegQuality] = useState<number | undefined>(
        defaultOptimization.jpegQuality,
    );
    const [targetDpi, setTargetDpi] = useState<number | undefined>(defaultOptimization.targetDpi);
    const [optimizationPreset, setOptimizationPresetState] = useState<ImageOptimizationPreset>(
        DEFAULT_OPTIMIZATION_PRESET,
    );
    const [, setShowFinalPreview] = useState(false);
    const selectedFile = useMemo(
        () => files.find((file) => file.id === selectedId) ?? null,
        [files, selectedId],
    );

    const setOptimizationPreset = useCallback((preset: ImageOptimizationPreset) => {
        if (preset === 'custom') {
            setOptimizationPresetState('custom');
            return;
        }

        const settings = getOptimizationSettings(preset);
        setOptimizationPresetState(preset);
        setJpegQuality(settings.jpegQuality);
        setTargetDpi(settings.targetDpi);
    }, []);

    const optimize = useMemo<OptimizeState>(
        () => ({
            imageFit,
            jpegQuality,
            targetDpi,
            optimizationPreset,
            setImageFit,
            setJpegQuality: (value) => {
                setJpegQuality(value);
                setOptimizationPresetState('custom');
            },
            setTargetDpi: (value) => {
                setTargetDpi(value);
                setOptimizationPresetState('custom');
            },
            setOptimizationPreset,
        }),
        [imageFit, jpegQuality, optimizationPreset, setOptimizationPreset, targetDpi],
    );

    const workspace = useMemo(
        () =>
            ({
                files,
                editsByFile,
                selectedId,
                selectedFile,
                focusedSource: null,
                finalPages,
                selectedPdfPagesByFile: {},
                includedImagesByFile: {},
                selectFile: (id: string) => {
                    setSelectedId(id);
                },
                addFiles: async () => ({ files: [], skippedErrors: [] }),
                removeFile: (id: string) => {
                    setFiles((current) => current.filter((file) => file.id !== id));
                    setFinalPages((current) => current.filter((page) => page.fileId !== id));
                    setSelectedId((current) => {
                        if (current !== id) return current;
                        const remaining = files.filter((file) => file.id !== id);
                        return remaining[0]?.id ?? null;
                    });
                },
                clearAllFiles: () => {
                    setFiles([]);
                    setSelectedId(null);
                    setFinalPages([]);
                },
                rotatePage: async (
                    fileId: string,
                    target: SourceTarget,
                    direction: RotationDirection,
                ) => {
                    setEditsByFile((current) => ({
                        ...current,
                        [fileId]: FileEditsVO.applyRotation(current[fileId], target, direction),
                    }));
                },
                focusFinalPageSource: (fileId: string, _target: SourceTarget) =>
                    setSelectedId(fileId),
                focusFinalPageInDocument: (fileId: string, _target: SourceTarget) =>
                    setSelectedId(fileId),
                reorderFiles: (_fromId: string, _toId: string) => undefined,
                isDragOver: false,
                togglePage: (fileId: string, pageNum: number) => {
                    const pageId = toFinalPageId(fileId, { kind: 'pdf', pageNum });
                    setFinalPages((current) =>
                        current.some((page) => page.id === pageId)
                            ? current.filter((page) => page.id !== pageId)
                            : [...current, { id: pageId, fileId, kind: 'pdf', pageNum }],
                    );
                },
                setPdfPagesForFile: (fileId: string, pages: number[]) => {
                    setFinalPages((current) => [
                        ...current.filter((page) => page.fileId !== fileId),
                        ...pages.map((pageNum) => ({
                            id: toFinalPageId(fileId, { kind: 'pdf', pageNum }),
                            fileId,
                            kind: 'pdf' as const,
                            pageNum,
                        })),
                    ]);
                },
                setImageIncluded: (fileId: string, included: boolean) => {
                    setFinalPages((current) => [
                        ...current.filter((page) => page.fileId !== fileId),
                        ...(included
                            ? [
                                  {
                                      id: toFinalPageId(fileId, { kind: 'image' }),
                                      fileId,
                                      kind: 'image' as const,
                                  },
                              ]
                            : []),
                    ]);
                },
                addAllPagesForFile: (file: SourceFile) => {
                    if (file.kind === 'image') {
                        setFinalPages((current) => [
                            ...current.filter((page) => page.fileId !== file.id),
                            {
                                id: toFinalPageId(file.id, { kind: 'image' }),
                                fileId: file.id,
                                kind: 'image',
                            },
                        ]);
                        return;
                    }
                    const total = file.pageCount ?? 0;
                    setFinalPages((current) => [
                        ...current.filter((page) => page.fileId !== file.id),
                        ...Array.from({ length: total }, (_, index) => ({
                            id: toFinalPageId(file.id, {
                                kind: 'pdf',
                                pageNum: index + 1,
                            }),
                            fileId: file.id,
                            kind: 'pdf' as const,
                            pageNum: index + 1,
                        })),
                    ]);
                },
                removePagesForFile: (fileId: string) => {
                    setFinalPages((current) => current.filter((page) => page.fileId !== fileId));
                },
                clearAllPages: () => {
                    setFinalPages([]);
                },
                selectAll: (file: SourceFile) => {
                    if (file.kind === 'image') {
                        setFinalPages((current) => [
                            ...current.filter((page) => page.fileId !== file.id),
                            {
                                id: toFinalPageId(file.id, { kind: 'image' }),
                                fileId: file.id,
                                kind: 'image',
                            },
                        ]);
                        return;
                    }
                    const total = file.pageCount ?? 0;
                    setFinalPages((current) => [
                        ...current.filter((page) => page.fileId !== file.id),
                        ...Array.from({ length: total }, (_, index) => ({
                            id: toFinalPageId(file.id, {
                                kind: 'pdf',
                                pageNum: index + 1,
                            }),
                            fileId: file.id,
                            kind: 'pdf' as const,
                            pageNum: index + 1,
                        })),
                    ]);
                },
                deselectAll: (fileId: string) => {
                    setFinalPages((current) => current.filter((page) => page.fileId !== fileId));
                },
                removeFinalPage: (id: string) => {
                    setFinalPages((current) => current.filter((page) => page.id !== id));
                },
                reorderFinalPages: (_fromId: string, _toId: string) => undefined,
                moveFinalPageToIndex: (_id: string, _targetIndex: number) => undefined,
                toPdfFinalPageId: (fileId: string, pageNum: number) => `${fileId}:${pageNum}`,
                toImageFinalPageId: (fileId: string) => `${fileId}:image`,
            }) satisfies Partial<WorkspaceApi>,
        [editsByFile, files, finalPages, selectedFile, selectedId],
    ) as WorkspaceApi;

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            <PdfCacheProvider>
                <MainAppView
                    isDark={isDark}
                    accent={accent}
                    toggleTheme={toggleTheme}
                    setAccent={setAccent}
                    openReportBug={() => undefined}
                    tutorialStart={() => undefined}
                    canHelp={files.length > 0}
                    onQuickAdd={() => undefined}
                    canExport={finalPages.length > 0}
                    canPreview={finalPages.length > 0}
                    isDragOver={false}
                    workspace={workspace}
                    handleAddFiles={() => undefined}
                    focusedSourceTarget={null}
                    optimize={optimize}
                    exportMerged={async () => undefined}
                    setShowFinalPreview={setShowFinalPreview}
                />
            </PdfCacheProvider>
        </div>
    );
}
