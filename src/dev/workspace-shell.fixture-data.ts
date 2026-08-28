import type { SourceFile } from '@/capabilities/document-sources';

const WORKSPACE_SHELL_FIXTURE_FILES: SourceFile[] = [
    {
        id: 'fixture-pdf-contract',
        originalPath: '/fixtures/sample-document.pdf',
        name: 'contract-draft.pdf',
        byteSize: 2_450_000,
        pageCount: 12,
        kind: 'pdf',
    },
    {
        id: 'fixture-pdf-invoice',
        originalPath: '/fixtures/sample-document.pdf',
        name: 'invoice-042.pdf',
        byteSize: 840_000,
        pageCount: 3,
        kind: 'pdf',
    },
    {
        id: 'fixture-image-receipt',
        originalPath: '/fixtures/sample-image.jpg',
        name: 'receipt.jpg',
        byteSize: 480_000,
        pageCount: 1,
        kind: 'image',
    },
    {
        id: 'fixture-image-scan',
        originalPath: '/fixtures/landscape.jpg',
        name: 'notes-scan.png',
        byteSize: 1_120_000,
        pageCount: 1,
        kind: 'image',
    },
    {
        id: 'fixture-pdf-report',
        originalPath: '/fixtures/sample-document.pdf',
        name: 'monthly-report.pdf',
        byteSize: 5_600_000,
        pageCount: 28,
        kind: 'pdf',
    },
];

export function createWorkspaceShellFixtureFiles(): SourceFile[] {
    return WORKSPACE_SHELL_FIXTURE_FILES.map((file) => ({ ...file }));
}
