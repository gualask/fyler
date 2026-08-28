import type { SkippedFile } from '@/capabilities/document-sources';

export type AppStatusPayload = {
    kind: 'import-warning';
    skippedCount: number;
    preview: SkippedFile[];
    hasMore: boolean;
};
