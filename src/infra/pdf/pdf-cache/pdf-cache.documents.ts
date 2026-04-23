import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { getPreviewUrl } from '@/infra/platform';
import type { SourceFile } from '@/shared/domain';

/**
 * Internal caches for pdf.js loading tasks and resolved `PDFDocumentProxy` promises.
 *
 * The promise cache ensures the same PDF is only loaded once per source file.
 */
export type PdfDocumentCaches = {
    tasksByFileId: Map<string, PDFDocumentLoadingTask>;
    promisesByFileId: Map<string, Promise<PDFDocumentProxy>>;
};

/**
 * Returns the cached `PDFDocumentProxy` promise for `file`, or starts a new pdf.js loading task.
 *
 * On failure, it evicts the cached entries and destroys the pdf.js loading task.
 */
export function getOrCreatePdfDocument(
    file: SourceFile,
    { tasksByFileId, promisesByFileId }: PdfDocumentCaches,
): Promise<PDFDocumentProxy> {
    const existing = promisesByFileId.get(file.id);
    if (existing) return existing;

    const promiseRef: { current?: Promise<PDFDocumentProxy> } = {};
    const promise = (async () => {
        let loadingTask: PDFDocumentLoadingTask | undefined;
        try {
            const { pdfjsLib } = await import('../render');
            if (promisesByFileId.get(file.id) !== promiseRef.current) {
                throw new Error('PDF load cancelled');
            }

            loadingTask = pdfjsLib.getDocument({ url: getPreviewUrl(file.originalPath) });
            tasksByFileId.set(file.id, loadingTask);
            return await loadingTask.promise;
        } catch (error) {
            promisesByFileId.delete(file.id);
            if (tasksByFileId.get(file.id) === loadingTask) {
                tasksByFileId.delete(file.id);
            }
            void loadingTask?.destroy();
            throw error;
        }
    })();
    promiseRef.current = promise;
    promisesByFileId.set(file.id, promise);
    return promise;
}

/** Destroys (if present) the pdf.js loading task for `fileId` and clears cached references. */
export function destroyPdfDocument(
    fileId: string,
    { tasksByFileId, promisesByFileId }: PdfDocumentCaches,
) {
    promisesByFileId.delete(fileId);

    const task = tasksByFileId.get(fileId);
    tasksByFileId.delete(fileId);
    void task?.destroy();
}

/** Destroys all pdf.js loading tasks and clears the caches. */
export function destroyAllPdfDocuments({ tasksByFileId, promisesByFileId }: PdfDocumentCaches) {
    for (const task of tasksByFileId.values()) {
        void task.destroy();
    }
    tasksByFileId.clear();
    promisesByFileId.clear();
}
