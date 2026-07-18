import type { SkippedFile } from '@/shared/domain';

export type MergeProgressStep =
    | 'preparing-documents'
    | 'merging-pages'
    | 'optimizing-images'
    | 'saving';

export type ImportWarningSkippedFile = SkippedFile;

type ImportWarningStatus = {
    kind: 'import-warning';
    skippedCount: number;
    preview: ImportWarningSkippedFile[];
    hasMore: boolean;
};

export type AppStatusPayload = ImportWarningStatus;
