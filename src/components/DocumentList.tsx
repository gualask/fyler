import type { Doc } from '../domain';
import { DocumentRow } from './DocumentRow';

/** Props for the left panel showing the loaded document list. */
interface Props {
    docs: Doc[];
    selectedId: string | null;
    error: string | null;
    onSelect: (id: string) => void;
    onPageSpecChange: (id: string, value: string) => void;
    onDragStart: (id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (id: string) => void;
}

/**
 * Left panel: header with document count, optional error banner,
 * and a scrollable list of {@link DocumentRow} with drag-and-drop support.
 */
export function DocumentList({ docs, selectedId, error, onSelect, onPageSpecChange, onDragStart, onDragOver, onDrop }: Props) {
    return (
        <div className="flex w-[420px] shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Documenti</span>
                <span className="text-xs text-ui-text-muted">{docs.length} file</span>
            </div>

            {error && (
                <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    {error}
                </p>
            )}

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
                                onDragStart={onDragStart}
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
