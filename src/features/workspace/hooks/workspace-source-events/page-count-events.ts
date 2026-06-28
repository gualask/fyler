import { onTauriEvent } from '@/infra/platform/events';
import type { SourceFile } from '@/shared/domain';
import type {
    SourcePageCountErrorPayload,
    SourcePageCountPayload,
} from './workspace-source-events.types';

interface SourcePageCountEventHandlers {
    onPageCount: (payload: SourcePageCountPayload) => void;
    onPageCountError: (payload: SourcePageCountErrorPayload) => void;
}

export function pageCountErrorCode(
    reason: string | undefined,
): 'open_pdf_failed' | 'password_required_pdf' {
    return reason === 'password_required_pdf' ? 'password_required_pdf' : 'open_pdf_failed';
}

export function subscribeToSourcePageCountEvents({
    onPageCount,
    onPageCountError,
}: SourcePageCountEventHandlers): () => void {
    const unlistenPageCount = onTauriEvent<SourcePageCountPayload>('source-page-count', (event) => {
        onPageCount(event.payload);
    });
    const unlistenPageCountError = onTauriEvent<SourcePageCountErrorPayload>(
        'source-page-count-error',
        (event) => {
            onPageCountError(event.payload);
        },
    );

    return () => {
        unlistenPageCount();
        unlistenPageCountError();
    };
}

export function pdfPageNumbers(pageCount: number): number[] {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
}

interface ApplyResolvedPageCountParams {
    fileId: string;
    pageCount: number;
    updateFilePageCount: (id: string, count: number) => void;
    setPdfPagesForFile: (fileId: string, pages: number[]) => void;
}

export function applyResolvedPageCount({
    fileId,
    pageCount,
    updateFilePageCount,
    setPdfPagesForFile,
}: ApplyResolvedPageCountParams) {
    updateFilePageCount(fileId, pageCount);
    setPdfPagesForFile(fileId, pdfPageNumbers(pageCount));
}

interface HandleSourcePageCountParams extends ApplyResolvedPageCountParams {
    files: SourceFile[];
    pendingPageCounts: Map<string, number>;
}

export function handleSourcePageCount({
    fileId,
    pageCount,
    files,
    pendingPageCounts,
    updateFilePageCount,
    setPdfPagesForFile,
}: HandleSourcePageCountParams): 'applied' | 'pending' {
    if (!files.some((file) => file.id === fileId)) {
        pendingPageCounts.set(fileId, pageCount);
        return 'pending';
    }

    applyResolvedPageCount({
        fileId,
        pageCount,
        updateFilePageCount,
        setPdfPagesForFile,
    });
    return 'applied';
}
