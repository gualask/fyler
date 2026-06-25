import { configurePdfJsWorker, PDFJS_DOCUMENT_OPTIONS } from '@/infra/pdf/pdfjs-assets';

async function loadPdfJs() {
    if (typeof DOMMatrix === 'function') {
        return import('pdfjs-dist');
    }

    return import('pdfjs-dist/legacy/build/pdf.mjs');
}

export async function getBrowserPdfPageCount(file: File): Promise<number> {
    const pdfjsLib = await loadPdfJs();
    const canUseWorker = typeof Worker === 'function';
    if (canUseWorker) {
        configurePdfJsWorker(pdfjsLib);
    }

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        ...(canUseWorker ? PDFJS_DOCUMENT_OPTIONS : { disableWorker: true }),
    } as Parameters<typeof pdfjsLib.getDocument>[0]);
    const pdfDocument = await loadingTask.promise;

    try {
        return pdfDocument.numPages;
    } finally {
        await loadingTask.destroy();
    }
}
