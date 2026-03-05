import type { Doc } from '../domain';
import type { DragHandlers } from '../hooks/useDragDrop';
import { DocumentRow } from './DocumentRow';

/** Props for the left panel showing the loaded document list. */
interface Props {
    docs: Doc[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onPageSpecChange: (id: string, value: string) => void;
    dragHandlers: DragHandlers;
}

/**
 * Left panel: header with document count, optional error banner,
 * and a scrollable list of {@link DocumentRow} with drag-and-drop support.
 */
export function DocumentList({ docs, selectedId, onSelect, onPageSpecChange, dragHandlers }: Props) {
    return (
        <div className="flex w-[420px] shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Documenti</span>
                <span className="text-xs text-ui-text-muted">{docs.length} file</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {docs.length === 0 ? (
                    <p className="text-sm text-ui-text-muted">Aggiungi uno o più PDF per iniziare.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {docs.map((d) => (
                            <DocumentRow
                                key={d.id}
                                doc={d}
                                selected={d.id === selectedId}
                                onSelect={() => onSelect(d.id)}
                                onPageSpecChange={(v) => onPageSpecChange(d.id, v)}
                                dragHandlers={dragHandlers}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
