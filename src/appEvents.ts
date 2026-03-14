export type MergeProgressStep =
    | 'preparing-documents'
    | 'merging-pages'
    | 'optimizing-images'
    | 'saving';

export type ImportWarningStatus = {
    kind: 'import-warning';
    skippedCount: number;
    preview: string[];
    hasMore: boolean;
};

export type AppStatusPayload = ImportWarningStatus;
