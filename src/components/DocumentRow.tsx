import { Bars3Icon, DocumentIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { countSelectedPages, type Doc } from '../domain';

interface Props {
    doc: Doc;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
    onPageSpecChange: (value: string) => void;
}

function PageCount({ spec, total }: { spec: string; total: number }) {
    const selected = countSelectedPages(spec, total);
    if (selected === null) return null;
    return (
        <span className="shrink-0 text-xs text-ui-text-muted">
            {selected === total ? `${total} pag` : `${selected} / ${total} pag`}
        </span>
    );
}

export function DocumentRow(props: Props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: props.doc.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

    const isSpecInvalid =
        props.doc.kind === 'pdf' &&
        props.doc.pageSpec.trim() !== '' &&
        countSelectedPages(props.doc.pageSpec, props.doc.pageCount) === null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={props.onSelect}
            className={[
                'cursor-pointer select-none rounded-xl p-4 transition-colors',
                isDragging
                    ? 'opacity-50 shadow-lg'
                    : props.selected
                    ? 'border-2 border-ui-accent bg-ui-accent-soft'
                    : 'border border-ui-border bg-ui-surface hover:border-ui-border-hover',
            ].join(' ')}
        >
            <div className="flex items-center gap-3">
                <div
                    {...listeners}
                    className="shrink-0 cursor-grab text-ui-text-muted active:cursor-grabbing"
                >
                    <Bars3Icon className="h-4 w-4" />
                </div>

                {props.doc.kind === 'image' ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-900/30">
                        <PhotoIcon className="h-5 w-5" />
                    </div>
                ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-900/30">
                        <DocumentIcon className="h-5 w-5" />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ui-text">{props.doc.name}</p>
                    {props.doc.kind === 'pdf' && (
                        <p className="text-xs text-ui-text-muted">{props.doc.pageCount} pag</p>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); props.onRemove(); }}
                    className="shrink-0 rounded-lg p-1.5 text-ui-text-muted opacity-60 transition-colors hover:bg-red-50 hover:text-red-500 hover:opacity-100 dark:hover:bg-red-900/20"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>

            {props.doc.kind === 'pdf' && (
                <div className="mt-3 flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Pagine (es. 1-3, 5, 8)"
                        value={props.doc.pageSpec}
                        onChange={(e) => props.onPageSpecChange(e.currentTarget.value)}
                        onClick={(e) => e.stopPropagation()}
                        title={isSpecInvalid ? 'Formato non valido. Usa es. 1-3, 5, 8' : undefined}
                        className={[
                            'min-w-0 flex-1 rounded-lg border bg-ui-bg px-3 py-1.5 text-xs text-ui-text-secondary outline-none',
                            isSpecInvalid
                                ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-400'
                                : 'border-ui-border focus:border-ui-accent-muted focus:ring-1 focus:ring-ui-accent-muted',
                        ].join(' ')}
                    />
                    <PageCount spec={props.doc.pageSpec} total={props.doc.pageCount} />
                </div>
            )}
        </div>
    );
}
