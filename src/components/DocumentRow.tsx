import { Bars3Icon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';
import type { Doc } from '../domain';
import type { DragHandlers } from '../hooks/useDragDrop';

/** Props for a single document row in the document list. */
interface Props {
    doc: Doc;
    selected: boolean;
    onSelect: () => void;
    onPageSpecChange: (value: string) => void;
    dragHandlers: DragHandlers;
}

export function DocumentRow(props: Props) {
    const { onDragStart, onDragOver, onDrop } = props.dragHandlers;
    return (
        <div
            draggable
            onDragStart={() => onDragStart(props.doc.id)}
            onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
            onDrop={() => onDrop(props.doc.id)}
            onClick={props.onSelect}
            className={[
                'flex items-start gap-2 rounded-lg border p-3 cursor-pointer select-none',
                props.selected
                    ? 'border-ui-accent-muted bg-ui-accent-soft'
                    : 'border-ui-border bg-ui-surface hover:bg-ui-surface-hover',
            ].join(' ')}
        >
            {/* Drag handle */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 shrink-0 cursor-grab text-ui-text-muted"
            >
                <Bars3Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                        {props.doc.kind === 'image'
                            ? <PhotoIcon className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                            : <DocumentIcon className="h-3.5 w-3.5 shrink-0 text-red-400" />
                        }
                        <span className="truncate text-sm font-semibold text-ui-text">
                            {props.doc.name}
                        </span>
                    </div>
                    <span className="shrink-0 text-xs text-ui-text-muted">
                        {props.doc.pageCount} pag
                    </span>
                </div>
                {props.doc.kind === 'pdf' && (
                    <input
                        type="text"
                        placeholder="Pagine (es. 1-3,5,8)"
                        value={props.doc.pageSpec}
                        onChange={(e) => props.onPageSpecChange(e.currentTarget.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 w-full rounded border border-ui-border bg-ui-surface-hover px-2 py-1 text-xs text-ui-text-secondary outline-none focus:border-ui-accent-muted focus:bg-ui-surface"
                    />
                )}
            </div>
        </div>
    );
}
