import type { DocKind, FileEdits, QuarterTurn } from '.';

type RotationDirection = 'cw' | 'ccw';

const EMPTY_PAGE_ROTATIONS: Record<number, QuarterTurn> = {};

export function emptyFileEdits(): FileEdits {
    return { revision: 0, pageRotations: EMPTY_PAGE_ROTATIONS, imageRotation: 0 };
}

export function quarterTurnsToDegrees(turns: QuarterTurn): number {
    return turns * 90;
}

export function normalizeQuarterTurn(value: number): QuarterTurn {
    const normalized = ((value % 4) + 4) % 4;
    if (normalized !== 0 && normalized !== 1 && normalized !== 2 && normalized !== 3) {
        throw new Error(`Unsupported quarter turn: ${value}`);
    }
    return normalized as QuarterTurn;
}

export function directionToQuarterTurnDelta(direction: RotationDirection): QuarterTurn {
    return direction === 'cw' ? 1 : 3;
}

export function getPdfPageQuarterTurn(edits: FileEdits | undefined, pageNum: number): QuarterTurn {
    return edits?.pageRotations?.[pageNum] ?? 0;
}

export function getPdfPageRotationDegrees(edits: FileEdits | undefined, pageNum: number): number {
    return quarterTurnsToDegrees(getPdfPageQuarterTurn(edits, pageNum));
}

export function getImageQuarterTurn(edits: FileEdits | undefined): QuarterTurn {
    return edits?.imageRotation ?? 0;
}

export function getImageRotationDegrees(edits: FileEdits | undefined): number {
    return quarterTurnsToDegrees(getImageQuarterTurn(edits));
}

export function applyRotationToEdits(
    current: FileEdits | undefined,
    kind: DocKind,
    pageNum: number,
    direction: RotationDirection,
): FileEdits {
    const base = current ?? emptyFileEdits();
    const delta = directionToQuarterTurnDelta(direction);

    if (kind === 'image') {
        const nextRotation = normalizeQuarterTurn(getImageQuarterTurn(base) + delta);
        return {
            revision: base.revision + 1,
            pageRotations: base.pageRotations ?? EMPTY_PAGE_ROTATIONS,
            imageRotation: nextRotation,
        };
    }

    const pageRotations = { ...(base.pageRotations ?? EMPTY_PAGE_ROTATIONS) };
    const nextRotation = normalizeQuarterTurn(getPdfPageQuarterTurn(base, pageNum) + delta);
    if (nextRotation === 0) {
        delete pageRotations[pageNum];
    } else {
        pageRotations[pageNum] = nextRotation;
    }

    return {
        revision: base.revision + 1,
        pageRotations,
        imageRotation: base.imageRotation ?? 0,
    };
}

export function getPdfThumbnailSignature(edits: FileEdits | undefined, pageNum: number): string {
    return `r:${getPdfPageQuarterTurn(edits, pageNum)}`;
}

export type { RotationDirection };
