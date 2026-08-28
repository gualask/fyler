import type { ListItem } from '../list-item.types';

export type ReorderCommit = {
    fromId: string;
    toId: string;
    position: number;
};

export function ordersMatch(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function resolveReorderCommit(
    originalOrder: readonly string[],
    draftOrder: readonly string[],
    activeId: string,
): ReorderCommit | null {
    if (originalOrder.length !== draftOrder.length) return null;

    const originalSet = new Set(originalOrder);
    if (originalSet.size !== originalOrder.length) return null;
    if (new Set(draftOrder).size !== draftOrder.length) return null;
    if (draftOrder.some((id) => !originalSet.has(id))) return null;

    const fromIndex = originalOrder.indexOf(activeId);
    const targetIndex = draftOrder.indexOf(activeId);
    if (fromIndex === -1 || targetIndex === -1 || fromIndex === targetIndex) return null;

    return {
        fromId: activeId,
        toId: originalOrder[targetIndex],
        position: targetIndex + 1,
    };
}

export function orderListItems(items: readonly ListItem[], order: readonly string[]): ListItem[] {
    const itemsById = new Map(items.map((item) => [item.page.id, item]));
    const ordered = order.flatMap((id) => {
        const item = itemsById.get(id);
        return item ? [item] : [];
    });

    if (ordered.length === items.length) return ordered;

    const orderedIds = new Set(ordered.map((item) => item.page.id));
    return [...ordered, ...items.filter((item) => !orderedIds.has(item.page.id))];
}
