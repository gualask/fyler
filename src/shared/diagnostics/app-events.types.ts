export type MergeProgressStep =
    | 'preparing-documents'
    | 'merging-pages'
    | 'optimizing-images'
    | 'saving';

export type ImportWarningSkippedFile = {
    name: string;
    reason: string;
    detail?: string;
};

export type ImportWarningStatus = {
    kind: 'import-warning';
    skippedCount: number;
    preview: ImportWarningSkippedFile[];
    hasMore: boolean;
};

export type AppStatusPayload = ImportWarningStatus;
