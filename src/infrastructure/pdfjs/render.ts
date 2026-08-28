import * as pdfjsLib from 'pdfjs-dist';
import { configurePdfJsWorker, PDFJS_DOCUMENT_OPTIONS } from './pdfjs-assets';

configurePdfJsWorker(pdfjsLib);

export { PDFJS_DOCUMENT_OPTIONS, pdfjsLib };

export type PdfRenderResult = { blob: Blob; aspectRatio: number };

const DEFAULT_JPEG_QUALITY = 0.92;

function safePositiveNumber(value: number, fallback: number) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function safeDensity(value: number) {
    return Number.isFinite(value) ? Math.max(1, value) : 1;
}

function safeJpegQuality(value: number) {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_JPEG_QUALITY;
}

function assertValidViewport(viewport: { width: number; height: number }) {
    if (
        !Number.isFinite(viewport.width) ||
        !Number.isFinite(viewport.height) ||
        viewport.width <= 0 ||
        viewport.height <= 0
    ) {
        throw new Error('Invalid PDF page viewport');
    }
}

function viewportAspectRatio(viewport: { width: number; height: number }) {
    const rawAspectRatio = viewport.width / viewport.height;
    return Number.isFinite(rawAspectRatio) && rawAspectRatio > 0 ? rawAspectRatio : 1;
}

function createViewportCanvas(viewport: { width: number; height: number }) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(safePositiveNumber(viewport.width, 1)));
    canvas.height = Math.max(1, Math.floor(safePositiveNumber(viewport.height, 1)));
    return canvas;
}

function getCanvasContext(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('2D context unavailable');
    }
    return ctx;
}

function fillCanvasBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function encodeCanvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (value) => {
                if (value) {
                    resolve(value);
                } else {
                    reject(new Error('Failed to encode PDF page to blob'));
                }
            },
            'image/jpeg',
            quality,
        );
    });
}

/**
 * Renders a single PDF page into a JPEG blob.
 *
 * - `width` is the target output width in CSS pixels.
 * - `quality` is clamped to `[0..1]` and passed to JPEG encoding.
 * - `rotation` is in degrees.
 * - `density` is a resolution multiplier; values < 1 are treated as 1.
 *
 * Returns the page aspect ratio computed from the unscaled viewport (rotation-aware).
 */
export async function renderPdfPage(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    width: number,
    quality: number,
    rotation = 0,
    density = 1,
): Promise<PdfRenderResult> {
    const page = await pdfDoc.getPage(pageNum);
    const targetWidth = safePositiveNumber(width, 1);
    const renderDensity = safeDensity(density);
    const jpegQuality = safeJpegQuality(quality);
    const baseViewport = page.getViewport({ scale: 1, rotation });
    assertValidViewport(baseViewport);

    const aspectRatio = viewportAspectRatio(baseViewport);
    const renderScale = (targetWidth / baseViewport.width) * renderDensity;
    const viewport = page.getViewport({ scale: renderScale, rotation });
    const canvas = createViewportCanvas(viewport);
    const ctx = getCanvasContext(canvas);

    fillCanvasBackground(ctx, canvas);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await encodeCanvasToJpeg(canvas, jpegQuality);
    return { blob, aspectRatio };
}
