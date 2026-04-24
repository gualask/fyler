import { useMemo, useState } from 'react';
import { FinalDocument } from '@/features/final-document';
import { PdfCacheProvider } from '@/infra/pdf';
import type { FileEdits, FinalPage } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import {
    createSampleEditsByFile,
    createSampleFinalPages,
    createSampleFixtureFiles,
} from './sample-assets.fixture-data';

function reorderFinalPages(finalPages: FinalPage[], fromId: string, toId: string): FinalPage[] {
    const fromIndex = finalPages.findIndex((page) => page.id === fromId);
    const toIndex = finalPages.findIndex((page) => page.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return finalPages;
    }

    const next = [...finalPages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
}

function moveFinalPageToIndex(
    finalPages: FinalPage[],
    id: string,
    targetIndex: number,
): FinalPage[] {
    const currentIndex = finalPages.findIndex((page) => page.id === id);

    if (currentIndex === -1) {
        return finalPages;
    }

    const boundedIndex = Math.max(0, Math.min(targetIndex, finalPages.length - 1));
    if (boundedIndex === currentIndex) {
        return finalPages;
    }

    const next = [...finalPages];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(boundedIndex, 0, moved);
    return next;
}

export function FinalDocumentFixturePage() {
    const files = useMemo(() => createSampleFixtureFiles(), []);
    const [finalPages, setFinalPages] = useState(createSampleFinalPages);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(finalPages[0]?.id ?? null);
    const [editsByFile, setEditsByFile] =
        useState<Record<string, FileEdits>>(createSampleEditsByFile);

    return (
        <PdfCacheProvider>
            <div className="min-h-screen bg-ui-bg p-6 text-ui-text">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                    <div className="rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                            Final Document Fixture
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold">Final document preview</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-ui-text-secondary">
                            Browser-safe fixture with real PDF and image assets for auditing
                            populated final document states.
                        </p>
                    </div>

                    <div className="h-[78vh] overflow-hidden rounded-3xl border border-ui-border bg-ui-surface shadow-sm">
                        <FinalDocument
                            finalPages={finalPages}
                            files={files}
                            imageFit="contain"
                            selectedPageId={selectedPageId}
                            onReorder={(fromId, toId) =>
                                setFinalPages((current) => reorderFinalPages(current, fromId, toId))
                            }
                            onMovePageToIndex={(id, targetIndex) =>
                                setFinalPages((current) =>
                                    moveFinalPageToIndex(current, id, targetIndex),
                                )
                            }
                            onRemove={(id) => {
                                setFinalPages((current) =>
                                    current.filter((page) => page.id !== id),
                                );
                                setSelectedPageId((current) => (current === id ? null : current));
                            }}
                            onSelectPage={(fileId, target) =>
                                setSelectedPageId(toFinalPageId(fileId, target))
                            }
                            onRotatePage={async (fileId, target, direction) => {
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
                        />
                    </div>
                </div>
            </div>
        </PdfCacheProvider>
    );
}
