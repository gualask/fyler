import type { FileEdits, FinalPage, MergeRequest, OptimizeOptions } from '../dto/core.dto';

/** Builds the backend export request from the current composition state. */
export function buildMergeRequest(
    finalPages: FinalPage[],
    edits: Record<string, FileEdits>,
    outputPath: string,
    optimize?: OptimizeOptions,
): MergeRequest {
    return {
        pages: finalPages.map(({ fileId, pageNum }) => ({ fileId, pageNum })),
        edits,
        outputPath,
        optimize,
    };
}
