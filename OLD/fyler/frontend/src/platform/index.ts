import type {Doc, MergeRequest} from '../domain';

import {MergePDFs, OpenPDFsDialog, ReadPDFBytes, SavePDFDialog} from '../../wailsjs/go/main/App';

const PDF_PREVIEW_ROUTE = '/_fyler/pdf';

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

export async function openPDFsDialog(): Promise<Doc[]> {
    return OpenPDFsDialog();
}

export async function savePDFDialog(defaultFilename: string): Promise<string> {
    return SavePDFDialog(defaultFilename);
}

export async function readPDFBytes(path: string): Promise<Uint8Array> {
    const payload: unknown = await ReadPDFBytes(path);

    if (typeof payload === 'string') {
        return base64ToUint8Array(payload);
    }

    if (payload instanceof Uint8Array) {
        return payload;
    }

    if (Array.isArray(payload)) {
        return new Uint8Array(payload);
    }

    throw new Error('Formato PDF bytes non supportato');
}

export function getPDFPreviewUrl(path: string): string {
    const url = new URL(PDF_PREVIEW_ROUTE, window.location.origin);
    url.searchParams.set('path', path);
    return url.toString();
}

export async function mergePDFs(req: MergeRequest): Promise<void> {
    await MergePDFs(req as any);
}
