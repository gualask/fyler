import type { PDFDocumentProxy } from 'pdfjs-dist';

const REGION_WIDTH_IN = 190 / 25.4;
const REGION_HEIGHT_IN = 133.5 / 25.4;
const TARGET_DPI = 300;
const MAX_IMAGE_DIMENSION = 32_768;
const MAX_IMAGE_PIXELS = 64 * 1024 * 1024;

export type RasterSize = { width: number; height: number };

function containedSize(width: number, height: number, aspectRatio: number): RasterSize {
    const widthFromHeight = height * aspectRatio;
    return widthFromHeight <= width
        ? { width: widthFromHeight, height }
        : { width, height: width / aspectRatio };
}

/** Resolves enough pixels for 300 effective DPI before or after a quarter-turn edit. */
export function requiredPdfRasterSize(aspectRatio: number): RasterSize {
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
        throw new Error('Invalid PDF page aspect ratio');
    }
    const normal = containedSize(REGION_WIDTH_IN, REGION_HEIGHT_IN, aspectRatio);
    const rotated = containedSize(REGION_WIDTH_IN, REGION_HEIGHT_IN, 1 / aspectRatio);
    const width = Math.ceil(Math.max(normal.width, rotated.height) * TARGET_DPI);
    const height = Math.ceil(width / aspectRatio);
    if (
        width > MAX_IMAGE_DIMENSION ||
        height > MAX_IMAGE_DIMENSION ||
        width * height > MAX_IMAGE_PIXELS
    ) {
        throw new Error('PDF page raster exceeds the supported image safety limit');
    }
    return { width, height };
}

export async function rasterizePdfPage(
    pdfDocument: PDFDocumentProxy,
    pageNum: number,
): Promise<Uint8Array> {
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > pdfDocument.numPages) {
        throw new Error('PDF page is outside the available range');
    }
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1, rotation: page.rotate });
    const size = requiredPdfRasterSize(viewport.width / viewport.height);
    const { renderPdfPage } = await import('@/infrastructure/pdfjs/render');
    const { blob } = await renderPdfPage(pdfDocument, pageNum, size.width, 0.92, page.rotate, 1);
    return new Uint8Array(await blob.arrayBuffer());
}
