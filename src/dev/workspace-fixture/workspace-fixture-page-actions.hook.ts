import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import type { FinalPage, SourceFile } from '@/shared/domain';
import {
    finalPagesForFile,
    finalPagesForPdfPages,
    moveFinalPageToIndexById,
    reorderFinalPagesById,
    replaceFinalPagesForFile,
    setImageFinalPageIncluded,
    togglePdfFinalPage,
} from './workspace-final-pages';

export function useWorkspaceFixturePageActions({
    setFinalPages,
}: {
    setFinalPages: Dispatch<SetStateAction<FinalPage[]>>;
}) {
    return useMemo(
        () => ({
            togglePage: (fileId: string, pageNum: number) => {
                setFinalPages((current) => togglePdfFinalPage(current, fileId, pageNum));
            },
            setPdfPagesForFile: (fileId: string, pages: number[]) => {
                setFinalPages((current) =>
                    replaceFinalPagesForFile(current, fileId, finalPagesForPdfPages(fileId, pages)),
                );
            },
            setImageIncluded: (fileId: string, included: boolean) => {
                setFinalPages((current) => setImageFinalPageIncluded(current, fileId, included));
            },
            addAllPagesForFile: (file: SourceFile) => {
                setFinalPages((current) =>
                    replaceFinalPagesForFile(current, file.id, finalPagesForFile(file)),
                );
            },
            removePagesForFile: (fileId: string) => {
                setFinalPages((current) => current.filter((page) => page.fileId !== fileId));
            },
            clearAllPages: () => {
                setFinalPages([]);
            },
            selectAll: (file: SourceFile) => {
                setFinalPages((current) =>
                    replaceFinalPagesForFile(current, file.id, finalPagesForFile(file)),
                );
            },
            deselectAll: (fileId: string) => {
                setFinalPages((current) => current.filter((page) => page.fileId !== fileId));
            },
            removeFinalPage: (id: string) => {
                setFinalPages((current) => current.filter((page) => page.id !== id));
            },
            reorderFinalPages: (fromId: string, toId: string) => {
                setFinalPages((current) => reorderFinalPagesById(current, fromId, toId));
            },
            moveFinalPageToIndex: (id: string, targetIndex: number) => {
                setFinalPages((current) => moveFinalPageToIndexById(current, id, targetIndex));
            },
            toPdfFinalPageId: (fileId: string, pageNum: number) => `${fileId}:${pageNum}`,
            toImageFinalPageId: (fileId: string) => `${fileId}:image`,
        }),
        [setFinalPages],
    );
}
