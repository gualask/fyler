import { Bars3Icon } from '@heroicons/react/24/outline';
import type { Doc } from '../domain';

export function DocumentRow(props: {
    doc: Doc;
    selected: boolean;
    onSelect: () => void;
    onPageSpecChange: (value: string) => void;
    onDragStart: (id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (id: string) => void;
}) {
    return (
        <div
            draggable
            onDragStart={() => props.onDragStart(props.doc.id)}
            onDragOver={(e) => { e.preventDefault(); props.onDragOver(e); }}
            onDrop={() => props.onDrop(props.doc.id)}
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
                    <span className="truncate text-sm font-semibold text-ui-text">
                        {props.doc.name}
                    </span>
                    <span className="shrink-0 text-xs text-ui-text-muted">
                        {props.doc.pageCount} pag
                    </span>
                </div>
                <input
                    type="text"
                    placeholder="Pagine (es. 1-3,5,8)"
                    value={props.doc.pageSpec}
                    onChange={(e) => props.onPageSpecChange(e.currentTarget.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 w-full rounded border border-ui-border bg-ui-surface-hover px-2 py-1 text-xs text-ui-text-secondary outline-none focus:border-ui-accent-muted focus:bg-ui-surface"
                />
            </div>
        </div>
    );
}
