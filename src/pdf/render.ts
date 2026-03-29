import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };

export type PdfRenderResult = { blob: Blob; aspectRatio: number };

export async function renderPdfPage(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    width: number,
    quality: number,
    rotation = 0,
    density = 1,
): Promise<PdfRenderResult> {
    const page = await pdfDoc.getPage(pageNum);
    const safeWidth = Number.isFinite(width) && width > 0 ? width : 1;
    const safeDensity = Number.isFinite(density) ? Math.max(1, density) : 1;
    const safeQuality = Number.isFinite(quality) ? Math.min(1, Math.max(0, quality)) : 0.92;

    const baseViewport = page.getViewport({ scale: 1, rotation });
    if (
        !Number.isFinite(baseViewport.width) ||
        !Number.isFinite(baseViewport.height) ||
        baseViewport.width <= 0 ||
        baseViewport.height <= 0
    ) {
        throw new Error('Invalid PDF page viewport');
    }

    const rawAspectRatio = baseViewport.width / baseViewport.height;
    const aspectRatio = Number.isFinite(rawAspectRatio) && rawAspectRatio > 0 ? rawAspectRatio : 1;

    const scale = safeWidth / baseViewport.width;
    const renderScale = scale * safeDensity;
    const viewport = page.getViewport({ scale: renderScale, rotation });
    const canvas = document.createElement('canvas');
    const viewportWidth =
        Number.isFinite(viewport.width) && viewport.width > 0 ? viewport.width : 1;
    const viewportHeight =
        Number.isFinite(viewport.height) && viewport.height > 0 ? viewport.height : 1;
    canvas.width = Math.max(1, Math.floor(viewportWidth));
    canvas.height = Math.max(1, Math.floor(viewportHeight));
    // biome-ignore lint/style/noNonNullAssertion: canvas 2d context is always available
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (value) => {
                if (value) {
                    resolve(value);
                } else {
                    reject(new Error('Failed to encode PDF page to blob'));
                }
            },
            'image/jpeg',
            safeQuality,
        );
    });

    return { blob, aspectRatio };
}
