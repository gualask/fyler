async function loadPdfJs() {
    if (typeof DOMMatrix === 'function') {
        return import('pdfjs-dist');
    }

    return import('pdfjs-dist/legacy/build/pdf.mjs');
}

export async function getBrowserPdfPageCount(file: File): Promise<number> {
    const pdfjsLib = await loadPdfJs();
    const buffer = await file.arrayBuffer();
    // pdf.js supports `disableWorker`, but the published typings do not expose it.
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        disableWorker: true,
    } as Parameters<typeof pdfjsLib.getDocument>[0]);
    const pdfDocument = await loadingTask.promise;

    try {
        return pdfDocument.numPages;
    } finally {
        await pdfDocument.destroy();
    }
}
