import { useMemo, useState } from 'react';
import { PagePicker } from '@/features/page-picker';
import { PdfCacheProvider } from '@/infra/pdf';
import type { FileEdits, FinalPage, SourceTarget } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import {
    createSampleEditsByFile,
    createSampleFixtureFiles,
    SAMPLE_IMAGE_FILE,
    SAMPLE_PDF_FILE,
} from './sample-assets.fixture-data';

function getMode(search: string): 'pdf' | 'image' {
    return new URLSearchParams(search).get('mode') === 'image' ? 'image' : 'pdf';
}

function buildPdfInitialPages(): FinalPage[] {
    return [1, 3, 5].map((pageNum) => ({
        id: toFinalPageId(SAMPLE_PDF_FILE.id, { kind: 'pdf', pageNum }),
        fileId: SAMPLE_PDF_FILE.id,
        kind: 'pdf' as const,
        pageNum,
    }));
}

function buildImageInitialPages(): FinalPage[] {
    return [
        {
            id: toFinalPageId(SAMPLE_IMAGE_FILE.id, { kind: 'image' }),
            fileId: SAMPLE_IMAGE_FILE.id,
            kind: 'image' as const,
        },
    ];
}

function togglePdfPage(finalPages: FinalPage[], fileId: string, pageNum: number): FinalPage[] {
    const pageId = toFinalPageId(fileId, { kind: 'pdf', pageNum });
    const exists = finalPages.some((page) => page.id === pageId);

    if (exists) {
        return finalPages.filter((page) => page.id !== pageId);
    }

    return [
        ...finalPages,
        {
            id: pageId,
            fileId,
            kind: 'pdf',
            pageNum,
        },
    ];
}

function setPdfPages(fileId: string, pages: number[]): FinalPage[] {
    return pages.map((pageNum) => ({
        id: toFinalPageId(fileId, { kind: 'pdf', pageNum }),
        fileId,
        kind: 'pdf' as const,
        pageNum,
    }));
}

export function PagePickerFixturePage() {
    const files = useMemo(() => createSampleFixtureFiles(), []);
    const mode = getMode(window.location.search);
    const selectedFile = files.find((file) => file.kind === mode) ?? files[0] ?? null;
    const [finalPages, setFinalPages] = useState<FinalPage[]>(
        mode === 'image' ? buildImageInitialPages : buildPdfInitialPages,
    );
    const [focusedTarget, setFocusedTarget] = useState<SourceTarget | null>(
        mode === 'image' ? { kind: 'image' } : { kind: 'pdf', pageNum: 3 },
    );
    const [editsByFile, setEditsByFile] =
        useState<Record<string, FileEdits>>(createSampleEditsByFile);

    return (
        <PdfCacheProvider>
            <div className="min-h-screen bg-ui-bg p-6 text-ui-text">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                    <div className="rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                            Page Picker Fixture
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold">Page picker preview</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-ui-text-secondary">
                            Use `?dev=page-picker` for the PDF panel or
                            `?dev=page-picker&mode=image` for the image panel.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                            <a href="/?dev=page-picker" className="btn-ghost">
                                PDF mode
                            </a>
                            <a href="/?dev=page-picker&amp;mode=image" className="btn-ghost">
                                Image mode
                            </a>
                        </div>
                    </div>

                    <div className="h-[78vh] overflow-hidden rounded-3xl border border-ui-border bg-ui-surface shadow-sm">
                        <PagePicker
                            file={selectedFile}
                            finalPages={finalPages}
                            onTogglePage={(fileId, pageNum) =>
                                setFinalPages((current) => togglePdfPage(current, fileId, pageNum))
                            }
                            onSetPdfPages={(fileId, pages) =>
                                setFinalPages(setPdfPages(fileId, pages))
                            }
                            onSetImageIncluded={(fileId, included) =>
                                setFinalPages(
                                    included
                                        ? [
                                              {
                                                  id: toFinalPageId(fileId, { kind: 'image' }),
                                                  fileId,
                                                  kind: 'image',
                                              },
                                          ]
                                        : [],
                                )
                            }
                            onSelectAll={(file) => {
                                if (file.kind !== 'pdf') return;
                                const total = file.pageCount ?? 0;
                                setFinalPages(
                                    setPdfPages(
                                        file.id,
                                        Array.from({ length: total }, (_, index) => index + 1),
                                    ),
                                );
                            }}
                            onDeselectAll={() => setFinalPages([])}
                            onFocusTarget={(_fileId, target) => setFocusedTarget(target)}
                            onRotateTarget={async (fileId, target, direction) => {
                                setEditsByFile((current) => ({
                                    ...current,
                                    [fileId]: FileEditsVO.applyRotation(
                                        current[fileId],
                                        target,
                                        direction,
                                    ),
                                }));
                            }}
                            editsByFile={editsByFile}
                            focusedTarget={focusedTarget}
                        />
                    </div>
                </div>
            </div>
        </PdfCacheProvider>
    );
}
