import { ArrowUpTrayIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { countSelectedPages, type Doc } from '../domain';
import { DocumentRow } from './DocumentRow';

interface Props {
    docs: Doc[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onReorder: (fromId: string, toId: string) => void;
    onPageSpecChange: (id: string, value: string) => void;
    onAddFiles: () => void;
}

export function DocumentList({ docs, selectedId, onSelect, onRemove, onReorder, onPageSpecChange, onAddFiles }: Props) {
    const totalPages = docs.reduce((sum, d) => {
        const sel = countSelectedPages(d.pageSpec, d.pageCount);
        return sum + (sel ?? d.pageCount);
    }, 0);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onReorder(String(active.id), String(over.id));
        }
    };

    return (
        <div className="flex w-[420px] shrink-0 flex-col overflow-hidden border-r border-ui-border">
            <div className="flex shrink-0 items-center justify-between px-6 py-4">
                <h2 className="text-xl font-bold">Files</h2>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-ui-surface-hover px-2 py-0.5 text-sm font-medium text-ui-text-muted">
                        {docs.length} file
                    </span>
                    <button
                        onClick={onAddFiles}
                        title="Aggiungi file"
                        className="flex items-center gap-1.5 rounded-lg bg-ui-bg px-3 py-1.5 text-xs font-medium text-ui-text-secondary hover:bg-ui-surface-hover"
                    >
                        <DocumentPlusIcon className="h-4 w-4" />
                        Aggiungi
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                {docs.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-ui-text-muted">
                        <ArrowUpTrayIcon className="h-10 w-10 opacity-25" />
                        <p className="text-sm">Aggiungi o trascina i file qui</p>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={docs.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                            <div className="flex flex-col gap-3">
                                {docs.map((d) => (
                                    <DocumentRow
                                        key={d.id}
                                        doc={d}
                                        selected={d.id === selectedId}
                                        onSelect={() => onSelect(d.id)}
                                        onRemove={() => onRemove(d.id)}
                                        onPageSpecChange={(v) => onPageSpecChange(d.id, v)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {docs.length > 0 && (
                <div className="flex shrink-0 items-center justify-between border-t border-ui-border px-4 py-3">
                    <span className="text-xs text-ui-text-muted">Totale pagine</span>
                    <span className="text-xs font-semibold text-ui-text">{totalPages}</span>
                </div>
            )}
        </div>
    );
}
