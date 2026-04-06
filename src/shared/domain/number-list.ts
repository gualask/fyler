/**
 * De-duplicates and sorts a numeric collection in ascending order.
 *
 * Intended for UI selections (page numbers, indices, etc.) where order matters and duplicates
 * can appear due to incremental user actions.
 */
export function uniqueSortedNumbers(values: Iterable<number>): number[] {
    return Array.from(new Set(values)).sort((a, b) => a - b);
}
