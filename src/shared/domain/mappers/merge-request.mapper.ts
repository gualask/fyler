import type {
    ExportItem,
    FileEdits,
    FinalPage,
    MergeRequest,
    OptimizeOptions,
} from '../dto/core.dto';

/** Builds the backend export request from the current composition state. */
export function buildMergeRequest(
    finalPages: FinalPage[],
    edits: Record<string, FileEdits>,
    outputPath: string,
    optimize?: OptimizeOptions,
): MergeRequest {
    const pages: ExportItem[] = finalPages.map((page) =>
        page.kind === 'pdf'
            ? { kind: 'pdf', fileId: page.fileId, pageNum: page.pageNum }
            : { kind: 'image', fileId: page.fileId },
    );
    return {
        pages,
        edits,
        outputPath,
        optimize,
    };
}
