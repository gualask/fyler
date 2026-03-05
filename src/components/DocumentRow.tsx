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
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50',
            ].join(' ')}
        >
            {/* Drag handle */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 shrink-0 cursor-grab text-gray-400"
            >
                <Bars3Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-gray-800">
                        {props.doc.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                        {props.doc.pageCount} pag
                    </span>
                </div>
                <input
                    type="text"
                    placeholder="Pagine (es. 1-3,5,8)"
                    value={props.doc.pageSpec}
                    onChange={(e) => props.onPageSpecChange(e.currentTarget.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-400 focus:bg-white"
                />
            </div>
        </div>
    );
}
