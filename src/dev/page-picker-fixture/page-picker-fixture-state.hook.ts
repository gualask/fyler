import { useCallback, useMemo, useState } from 'react';
import type {
    FileEdits,
    FinalPage,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { createSampleEditsByFile, createSampleFixtureFiles } from '../sample-assets.fixture-data';
import { getPagePickerFixtureMode } from './page-picker-fixture-mode';
import {
    allPdfPageNumbers,
    buildImageInitialPages,
    buildPdfInitialPages,
    imagePages,
    pdfPages,
    previewPage,
    togglePdfPage,
} from './page-picker-fixture-pages';

type PreviewTarget = {
    file: SourceFile;
    page: FinalPage;
};

export interface PagePickerFixtureState {
    selectedFile: SourceFile | null;
    finalPages: FinalPage[];
    editsByFile: Record<string, FileEdits>;
    focusedTarget: SourceTarget | null;
    previewTarget: PreviewTarget | null;
    togglePage: (fileId: string, pageNum: number) => void;
    setPdfPagesForFile: (fileId: string, pages: number[]) => void;
    setImageIncluded: (fileId: string, included: boolean) => void;
    selectAll: (file: SourceFile) => void;
    deselectAll: (fileId: string) => void;
    focusTarget: (fileId: string, target: SourceTarget) => void;
    rotateTarget: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => Promise<void>;
    openPreviewTarget: (file: SourceFile, target: SourceTarget) => void;
    closePreview: () => void;
}

export function usePagePickerFixtureState(search: string): PagePickerFixtureState {
    const files = useMemo(() => createSampleFixtureFiles(), []);
    const mode = getPagePickerFixtureMode(search);
    const selectedFile = files.find((file) => file.kind === mode) ?? files[0] ?? null;
    const [finalPages, setFinalPages] = useState<FinalPage[]>(
        mode === 'image' ? buildImageInitialPages : buildPdfInitialPages,
    );
    const [focusedTarget, setFocusedTarget] = useState<SourceTarget | null>(
        mode === 'image' ? { kind: 'image' } : { kind: 'pdf', pageNum: 3 },
    );
    const [editsByFile, setEditsByFile] =
        useState<Record<string, FileEdits>>(createSampleEditsByFile);
    const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

    const rotateTarget = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            setEditsByFile((current) => ({
                ...current,
                [fileId]: FileEditsVO.applyRotation(current[fileId], target, direction),
            }));
        },
        [],
    );

    const openPreviewTarget = useCallback((file: SourceFile, target: SourceTarget) => {
        setPreviewTarget({ file, page: previewPage(file, target) });
    }, []);

    return {
        selectedFile,
        finalPages,
        editsByFile,
        focusedTarget,
        previewTarget,
        togglePage: (fileId, pageNum) =>
            setFinalPages((current) => togglePdfPage(current, fileId, pageNum)),
        setPdfPagesForFile: (fileId, pages) => setFinalPages(pdfPages(fileId, pages)),
        setImageIncluded: (fileId, included) => setFinalPages(imagePages(fileId, included)),
        selectAll: (file) => {
            if (file.kind !== 'pdf') return;

            setFinalPages(pdfPages(file.id, allPdfPageNumbers(file)));
        },
        deselectAll: () => setFinalPages([]),
        focusTarget: (_fileId, target) => setFocusedTarget(target),
        rotateTarget,
        openPreviewTarget,
        closePreview: () => setPreviewTarget(null),
    };
}
