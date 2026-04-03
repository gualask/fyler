import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { getPreviewUrl } from '@/infra/platform';
import type { SourceFile } from '@/shared/domain';
import { pdfjsLib } from '../render';

export type PdfDocumentCaches = {
    tasksByFileId: Map<string, PDFDocumentLoadingTask>;
    promisesByFileId: Map<string, Promise<PDFDocumentProxy>>;
};

export function getOrCreatePdfDocument(
    file: SourceFile,
    { tasksByFileId, promisesByFileId }: PdfDocumentCaches,
): Promise<PDFDocumentProxy> {
    const existing = promisesByFileId.get(file.id);
    if (existing) return existing;

    const loadingTask = pdfjsLib.getDocument({ url: getPreviewUrl(file.originalPath) });
    tasksByFileId.set(file.id, loadingTask);
    const promise = loadingTask.promise.catch((error) => {
        promisesByFileId.delete(file.id);
        tasksByFileId.delete(file.id);
        void loadingTask.destroy();
        throw error;
    });
    promisesByFileId.set(file.id, promise);
    return promise;
}

export function destroyPdfDocument(
    fileId: string,
    { tasksByFileId, promisesByFileId }: PdfDocumentCaches,
) {
    promisesByFileId.delete(fileId);

    const task = tasksByFileId.get(fileId);
    tasksByFileId.delete(fileId);
    void task?.destroy();
}

export function destroyAllPdfDocuments({ tasksByFileId, promisesByFileId }: PdfDocumentCaches) {
    for (const task of tasksByFileId.values()) {
        void task.destroy();
    }
    tasksByFileId.clear();
    promisesByFileId.clear();
}
