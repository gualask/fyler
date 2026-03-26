import type { ImageExportPreviewLayout } from '@/domain';

const EXPORT_PREVIEW_WIDTH = 900;

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

function buildRotatedImageCanvas(img: HTMLImageElement, quarterTurns: number): HTMLCanvasElement {
    const turns = ((quarterTurns % 4) + 4) % 4;
    const canvas = document.createElement('canvas');
    canvas.width = turns % 2 === 0 ? img.naturalWidth : img.naturalHeight;
    canvas.height = turns % 2 === 0 ? img.naturalHeight : img.naturalWidth;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('2D context unavailable');
    }

    switch (turns) {
        case 0:
            ctx.drawImage(img, 0, 0);
            break;
        case 1:
            ctx.translate(canvas.width, 0);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(img, 0, 0);
            break;
        case 2:
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
            ctx.drawImage(img, 0, 0);
            break;
        case 3:
            ctx.translate(0, canvas.height);
            ctx.rotate(-Math.PI / 2);
            ctx.drawImage(img, 0, 0);
            break;
        default:
            throw new Error(`Unsupported quarter turns: ${quarterTurns}`);
    }

    return canvas;
}

export async function renderRotatedImage(src: string, quarterTurns: number): Promise<string> {
    const img = await loadImage(src);
    const rotated = buildRotatedImageCanvas(img, quarterTurns);
    return rotated.toDataURL('image/jpeg', 0.92);
}

export async function renderExportMatchedImage(
    src: string,
    layout: ImageExportPreviewLayout,
    quarterTurns: number,
): Promise<string> {
    const img = await loadImage(src);
    const rotated = buildRotatedImageCanvas(img, quarterTurns);
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_PREVIEW_WIDTH;
    canvas.height = Math.max(
        1,
        Math.round((EXPORT_PREVIEW_WIDTH * layout.pageHeightPt) / layout.pageWidthPt),
    );

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('2D context unavailable');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const scale = canvas.width / layout.pageWidthPt;
    const drawX = layout.drawXPt * scale;
    const drawY = layout.drawYPt * scale;
    const drawWidth = layout.drawWidthPt * scale;
    const drawHeight = layout.drawHeightPt * scale;

    if (layout.clipToPage) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.clip();
        ctx.drawImage(rotated, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
    } else {
        ctx.drawImage(rotated, drawX, drawY, drawWidth, drawHeight);
    }

    return canvas.toDataURL('image/jpeg', 0.92);
}
