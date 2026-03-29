import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };

export type PdfRenderResult = { dataUrl: string; aspectRatio: number };

export async function renderPdfPage(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    width: number,
    quality: number,
    rotation = 0,
    density = 1,
): Promise<PdfRenderResult> {
    const page = await pdfDoc.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1, rotation });
    const aspectRatio = baseViewport.width / baseViewport.height;
    const scale = width / baseViewport.width;
    const renderScale = scale * Math.max(1, density);
    const viewport = page.getViewport({ scale: renderScale, rotation });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    // biome-ignore lint/style/noNonNullAssertion: canvas 2d context is always available
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), aspectRatio };
}
