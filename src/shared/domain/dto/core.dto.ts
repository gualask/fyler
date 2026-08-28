/**
 * Rotation expressed in 90° steps.
 *
 * `0 => 0°`, `1 => 90°`, `2 => 180°`, `3 => 270°`.
 */
export type QuarterTurn = 0 | 1 | 2 | 3;

/** Clockwise/counterclockwise 90° step direction. */
export type RotationDirection = 'cw' | 'ccw';
