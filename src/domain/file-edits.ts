import type { DocKind, FileEdits, QuarterTurn } from '.';

/** Clockwise/counterclockwise 90° step direction. */
type RotationDirection = 'cw' | 'ccw';

const EMPTY_PAGE_ROTATIONS: Record<number, QuarterTurn> = {};
const EMPTY_FILE_EDITS: FileEdits = Object.freeze({
    revision: 0,
    pageRotations: EMPTY_PAGE_ROTATIONS,
    imageRotation: 0,
});

/**
 * Returns a shared immutable "no edits" value.
 *
 * This object is reused to avoid allocations; treat it as read-only.
 */
export function emptyFileEdits(): FileEdits {
    return EMPTY_FILE_EDITS;
}

/** Converts a quarter-turn value (0..3) into degrees (0/90/180/270). */
export function quarterTurnsToDegrees(turns: QuarterTurn): number {
    return turns * 90;
}

/**
 * Normalizes an integer number of quarter turns into the canonical range `0..3`.
 *
 * Throws for non-finite inputs.
 */
export function normalizeQuarterTurn(value: number): QuarterTurn {
    const normalized = ((value % 4) + 4) % 4;
    if (normalized !== 0 && normalized !== 1 && normalized !== 2 && normalized !== 3) {
        throw new Error(`Unsupported quarter turn: ${value}`);
    }
    return normalized as QuarterTurn;
}

/**
 * Returns the quarter-turn delta for a rotation direction.
 *
 * `ccw` is represented as `-1 mod 4`, i.e. `+3`.
 */
export function directionToQuarterTurnDelta(direction: RotationDirection): QuarterTurn {
    return direction === 'cw' ? 1 : 3;
}

/**
 * Gets the stored rotation for a specific PDF page.
 *
 * Missing entries are treated as `0` (no rotation).
 */
export function getPdfPageQuarterTurn(edits: FileEdits | undefined, pageNum: number): QuarterTurn {
    return edits?.pageRotations?.[pageNum] ?? 0;
}

/** Like `getPdfPageQuarterTurn`, but returned as degrees. */
export function getPdfPageRotationDegrees(edits: FileEdits | undefined, pageNum: number): number {
    return quarterTurnsToDegrees(getPdfPageQuarterTurn(edits, pageNum));
}

/** Gets the stored rotation for an image source. Missing is treated as `0`. */
export function getImageQuarterTurn(edits: FileEdits | undefined): QuarterTurn {
    return edits?.imageRotation ?? 0;
}

/** Like `getImageQuarterTurn`, but returned as degrees. */
export function getImageRotationDegrees(edits: FileEdits | undefined): number {
    return quarterTurnsToDegrees(getImageQuarterTurn(edits));
}

/**
 * Applies a 90° rotation to the current edits and bumps the revision.
 *
 * For PDFs, the page rotation map stays sparse: rotating back to `0` deletes the entry.
 * The `revision` exists to make cache invalidation straightforward (thumbnails/previews).
 */
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

/**
 * Returns a stable, minimal signature for thumbnail cache keys.
 *
 * It intentionally encodes only what affects thumbnails today.
 */
export function getPdfThumbnailSignature(edits: FileEdits | undefined, pageNum: number): string {
    return `r:${getPdfPageQuarterTurn(edits, pageNum)}`;
}

export type { RotationDirection };
