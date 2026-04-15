import { useCallback, useMemo, useState } from 'react';

import { MainAppView } from '@/app/shell/MainAppView';
import type { OptimizeState } from '@/app/shell/main-app.types';
import type { WorkspaceApi } from '@/features/workspace';
import type {
    FileEdits,
    FinalPage,
    ImageFit,
    ImageOptimizationPreset,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';
import {
    DEFAULT_OPTIMIZATION_PRESET,
    getOptimizationSettings,
} from '@/shared/domain/value-objects/optimization-presets.vo';
import { useTheme } from '@/shared/preferences';

export function WorkspaceFixturePage({
    createInitialFiles,
}: {
    createInitialFiles: () => SourceFile[];
}) {
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const [files, setFiles] = useState(createInitialFiles);
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
                editsByFile: {} as Record<string, FileEdits>,
                selectedId: null,
                selectedFile: null,
                focusedSource: null,
                finalPages: [] as FinalPage[],
                selectedPdfPagesByFile: {},
                includedImagesByFile: {},
                selectFile: (_id: string) => {
                    // Intentionally disabled in browser-safe fixtures:
                    // selecting a file would enter Tauri-backed preview flows.
                },
                addFiles: async () => ({ files: [], skippedErrors: [] }),
                removeFile: (id: string) => {
                    setFiles((current) => current.filter((file) => file.id !== id));
                },
                clearAllFiles: () => {
                    setFiles([]);
                },
                rotatePage: async (
                    _fileId: string,
                    _target: SourceTarget,
                    _direction: RotationDirection,
                ) => undefined,
                focusFinalPageSource: (_fileId: string, _target: SourceTarget) => undefined,
                focusFinalPageInDocument: (_fileId: string, _target: SourceTarget) => undefined,
                reorderFiles: (_fromId: string, _toId: string) => undefined,
                isDragOver: false,
                togglePage: (_fileId: string, _pageNum: number) => undefined,
                setPdfPagesForFile: (_fileId: string, _pages: number[]) => undefined,
                setImageIncluded: (_fileId: string, _included: boolean) => undefined,
                addAllPagesForFile: (_file: SourceFile) => undefined,
                removePagesForFile: (_fileId: string) => undefined,
                clearAllPages: () => undefined,
                selectAll: (_file: SourceFile) => undefined,
                deselectAll: (_fileId: string) => undefined,
                removeFinalPage: (_id: string) => undefined,
                reorderFinalPages: (_fromId: string, _toId: string) => undefined,
                moveFinalPageToIndex: (_id: string, _targetIndex: number) => undefined,
                toPdfFinalPageId: (fileId: string, pageNum: number) => `${fileId}:${pageNum}`,
                toImageFinalPageId: (fileId: string) => `${fileId}:image`,
            }) satisfies Partial<WorkspaceApi>,
        [files],
    ) as WorkspaceApi;

    return (
        <MainAppView
            isDark={isDark}
            accent={accent}
            toggleTheme={toggleTheme}
            setAccent={setAccent}
            openReportBug={() => undefined}
            openAbout={() => undefined}
            tutorialStart={() => undefined}
            canHelp={files.length > 0}
            onQuickAdd={() => undefined}
            canExport={false}
            canPreview={false}
            isDragOver={false}
            workspace={workspace}
            handleAddFiles={() => undefined}
            focusedSourceTarget={null}
            optimize={optimize}
            exportMerged={async () => undefined}
            setShowFinalPreview={setShowFinalPreview}
        />
    );
}
