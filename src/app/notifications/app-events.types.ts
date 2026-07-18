import type { SkippedFile } from '@/shared/domain';

export type MergeProgressStep =
    | 'preparing-documents'
    | 'merging-pages'
    | 'optimizing-images'
    | 'saving';

export type AppStatusPayload = {
    kind: 'import-warning';
    skippedCount: number;
    preview: SkippedFile[];
    hasMore: boolean;
};
