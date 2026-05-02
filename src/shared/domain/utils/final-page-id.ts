import type { FinalPage, SourceTarget } from '../dto/core.dto';

const IMAGE_SUFFIX = ':image';

export function toFinalPageId(fileId: string, target: SourceTarget): string {
    return target.kind === 'image' ? `${fileId}${IMAGE_SUFFIX}` : `${fileId}:${target.pageNum}`;
}

export function parseFinalPageId(id: string): { fileId: string; target: SourceTarget } {
    if (id.endsWith(IMAGE_SUFFIX)) {
        return {
            fileId: id.slice(0, -IMAGE_SUFFIX.length),
            target: { kind: 'image' },
        };
    }

    const separator = id.lastIndexOf(':');
    if (separator === -1) {
        throw new Error(`Invalid final page id: ${id}`);
    }

    const fileId = id.slice(0, separator);
    const pageNum = Number.parseInt(id.slice(separator + 1), 10);
    if (!Number.isFinite(pageNum) || pageNum < 1) {
        throw new Error(`Invalid page number in final page id: ${id}`);
    }

    return {
        fileId,
        target: { kind: 'pdf', pageNum },
    };
}

export function finalPageToTarget(page: FinalPage): SourceTarget {
    return page.kind === 'pdf' ? { kind: 'pdf', pageNum: page.pageNum } : { kind: 'image' };
}
