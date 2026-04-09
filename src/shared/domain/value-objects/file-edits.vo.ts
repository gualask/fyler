import type { DocKind, FileEdits, QuarterTurn, RotationDirection } from '../dto/core.dto';
import { QuarterTurnVO } from './quarter-turn.vo';

const EMPTY_PAGE_ROTATIONS: Record<number, QuarterTurn> = {};
const EMPTY_FILE_EDITS: FileEdits = Object.freeze({
    revision: 0,
    pageRotations: EMPTY_PAGE_ROTATIONS,
    imageRotation: 0,
});

export const FileEditsVO = {
    /**
     * Returns a shared immutable "no edits" value.
     *
     * This object is reused to avoid allocations; treat it as read-only.
     */
    empty(): FileEdits {
        return EMPTY_FILE_EDITS;
    },

    /**
     * Gets the stored rotation for a specific PDF page.
     *
     * Missing entries are treated as `0` (no rotation).
     */
    getPdfPageQuarterTurn(edits: FileEdits | undefined, pageNum: number): QuarterTurn {
        return edits?.pageRotations?.[pageNum] ?? 0;
    },

    /** Like `getPdfPageQuarterTurn`, but returned as degrees. */
    getPdfPageRotationDegrees(edits: FileEdits | undefined, pageNum: number): number {
        return QuarterTurnVO.toDegrees(this.getPdfPageQuarterTurn(edits, pageNum));
    },

    /** Gets the stored rotation for an image source. Missing is treated as `0`. */
    getImageQuarterTurn(edits: FileEdits | undefined): QuarterTurn {
        return edits?.imageRotation ?? 0;
    },

    /** Like `getImageQuarterTurn`, but returned as degrees. */
    getImageRotationDegrees(edits: FileEdits | undefined): number {
        return QuarterTurnVO.toDegrees(this.getImageQuarterTurn(edits));
    },

    /**
     * Applies a 90° rotation to the current edits and bumps the revision.
     *
     * For PDFs, the page rotation map stays sparse: rotating back to `0` deletes the entry.
     * The `revision` exists to make cache invalidation straightforward (thumbnails/previews).
     */
    applyRotation(
        current: FileEdits | undefined,
        kind: DocKind,
        pageNum: number,
        direction: RotationDirection,
    ): FileEdits {
        const base = current ?? this.empty();
        const delta = direction === 'cw' ? 1 : 3;

        if (kind === 'image') {
            const nextRotation = QuarterTurnVO.normalize(this.getImageQuarterTurn(base) + delta);
            return {
                revision: base.revision + 1,
                pageRotations: base.pageRotations ?? EMPTY_PAGE_ROTATIONS,
                imageRotation: nextRotation,
            };
        }

        const pageRotations = { ...(base.pageRotations ?? EMPTY_PAGE_ROTATIONS) };
        const nextRotation = QuarterTurnVO.normalize(
            this.getPdfPageQuarterTurn(base, pageNum) + delta,
        );
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
    },

    /**
     * Returns a stable, minimal signature for thumbnail cache keys.
     *
     * It intentionally encodes only what affects thumbnails today.
     */
    pdfThumbnailSignature(edits: FileEdits | undefined, pageNum: number): string {
        return `r:${this.getPdfPageQuarterTurn(edits, pageNum)}`;
    },
};
