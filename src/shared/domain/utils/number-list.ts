/** Returns unique sorted integers from an iterable, preserving numeric ordering. */
export function uniqueSortedNumbers(values: Iterable<number>): number[] {
    return Array.from(new Set(values)).sort((a, b) => a - b);
}
