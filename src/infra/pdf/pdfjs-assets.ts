import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const PDFJS_DOCUMENT_OPTIONS = {
    cMapPacked: true,
    cMapUrl: '/pdfjs/cmaps/',
    iccUrl: '/pdfjs/iccs/',
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
} as const;

export function configurePdfJsWorker(pdfjsLib: { GlobalWorkerOptions: { workerSrc: string } }) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}
