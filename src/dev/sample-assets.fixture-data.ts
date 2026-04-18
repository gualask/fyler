import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';

export const SAMPLE_PDF_FILE: SourceFile = {
    id: 'sample-pdf-file',
    originalPath: '/fixtures/sample-document.pdf',
    name: 'sample-document.pdf',
    byteSize: 469_513,
    pageCount: 7,
    kind: 'pdf',
};

export const SAMPLE_IMAGE_FILE: SourceFile = {
    id: 'sample-image-file',
    originalPath: '/fixtures/sample-image.jpg',
    name: 'sample-image.jpg',
    byteSize: 53_932,
    pageCount: 1,
    kind: 'image',
};

export function createSampleFixtureFiles(): SourceFile[] {
    return [SAMPLE_PDF_FILE, SAMPLE_IMAGE_FILE].map((file) => ({ ...file }));
}

export function createSampleFinalPages(): FinalPage[] {
    return [
        {
            id: toFinalPageId(SAMPLE_PDF_FILE.id, { kind: 'pdf', pageNum: 1 }),
            fileId: SAMPLE_PDF_FILE.id,
            kind: 'pdf',
            pageNum: 1,
        },
        {
            id: toFinalPageId(SAMPLE_IMAGE_FILE.id, { kind: 'image' }),
            fileId: SAMPLE_IMAGE_FILE.id,
            kind: 'image',
        },
        {
            id: toFinalPageId(SAMPLE_PDF_FILE.id, { kind: 'pdf', pageNum: 3 }),
            fileId: SAMPLE_PDF_FILE.id,
            kind: 'pdf',
            pageNum: 3,
        },
        {
            id: toFinalPageId(SAMPLE_PDF_FILE.id, { kind: 'pdf', pageNum: 5 }),
            fileId: SAMPLE_PDF_FILE.id,
            kind: 'pdf',
            pageNum: 5,
        },
    ];
}

export function createSampleEditsByFile(): Record<string, FileEdits> {
    return {
        [SAMPLE_PDF_FILE.id]: {
            revision: 2,
            pageRotations: {
                3: 1,
                5: 2,
            },
            imageRotation: 0,
        },
        [SAMPLE_IMAGE_FILE.id]: {
            revision: 1,
            pageRotations: {},
            imageRotation: 1,
        },
    };
}
