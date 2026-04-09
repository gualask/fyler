import type { QuarterTurn } from '../dto/core.dto';

export const QuarterTurnVO = {
    /** Converts a quarter-turn value (0..3) into degrees (0/90/180/270). */
    toDegrees(turns: QuarterTurn): number {
        return turns * 90;
    },

    /**
     * Normalizes an integer number of quarter turns into the canonical range `0..3`.
     *
     * Throws for non-finite inputs.
     */
    normalize(value: number): QuarterTurn {
        const normalized = ((value % 4) + 4) % 4;
        if (normalized !== 0 && normalized !== 1 && normalized !== 2 && normalized !== 3) {
            throw new Error(`Unsupported quarter turn: ${value}`);
        }
        return normalized as QuarterTurn;
    },
};
