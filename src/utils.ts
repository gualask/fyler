/** Sposta l'elemento con `fromId` nella posizione di `toId` nell'array. */
export function reorderById<T extends { id: string }>(arr: T[], fromId: string, toId: string): T[] {
    const fromIdx = arr.findIndex((x) => x.id === fromId);
    const toIdx = arr.findIndex((x) => x.id === toId);
    if (fromIdx === -1 || toIdx === -1) return arr;
    const next = [...arr];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
}
