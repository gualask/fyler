import type { SourceFile } from '@/shared/domain';

const WORKSPACE_SHELL_FIXTURE_FILES: SourceFile[] = [
    {
        id: 'fixture-pdf-contract',
        originalPath: '/fixtures/contract-draft.pdf',
        name: 'contract-draft.pdf',
        byteSize: 2_450_000,
        pageCount: 12,
        kind: 'pdf',
    },
    {
        id: 'fixture-pdf-invoice',
        originalPath: '/fixtures/invoice-042.pdf',
        name: 'invoice-042.pdf',
        byteSize: 840_000,
        pageCount: 3,
        kind: 'pdf',
    },
    {
        id: 'fixture-image-receipt',
        originalPath: '/fixtures/receipt.jpg',
        name: 'receipt.jpg',
        byteSize: 480_000,
        pageCount: 1,
        kind: 'image',
    },
    {
        id: 'fixture-image-scan',
        originalPath: '/fixtures/notes-scan.png',
        name: 'notes-scan.png',
        byteSize: 1_120_000,
        pageCount: 1,
        kind: 'image',
    },
    {
        id: 'fixture-pdf-report',
        originalPath: '/fixtures/monthly-report.pdf',
        name: 'monthly-report.pdf',
        byteSize: 5_600_000,
        pageCount: 28,
        kind: 'pdf',
    },
];

export function createWorkspaceShellFixtureFiles(): SourceFile[] {
    return WORKSPACE_SHELL_FIXTURE_FILES.map((file) => ({ ...file }));
}
