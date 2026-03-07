import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon, DocumentIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { SourceFile, FinalPage } from '../domain';
import { useThumbnailCache } from '../hooks/useThumbnailCache';
import { getPreviewUrl } from '../platform';

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedFileId: string | null;
    onReorder: (fromId: string, toId: string) => void;
    onRemove: (id: string) => void;
}

function FinalPageRow({
    fp,
    file,
    index,
    selectedFileId,
    onRemove,
}: {
    fp: FinalPage;
    file: SourceFile | undefined;
    index: number;
    selectedFileId: string | null;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: fp.id,
    });
    const { getThumbnail } = useThumbnailCache();

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

    const isHighlighted = fp.fileId === selectedFileId;
    const thumbUrl =
        file?.kind === 'pdf' ? getThumbnail(getPreviewUrl(file.path), fp.pageNum) : null;
    const imageUrl = file?.kind === 'image' ? getPreviewUrl(file.path) : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={['flex items-center gap-3', isDragging ? 'opacity-50' : ''].join(' ')}
        >
            <span className="w-4 shrink-0 text-center text-xs font-bold text-ui-text-muted">
                {index + 1}
            </span>

            <div
                className={[
                    'group relative flex flex-1 items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                    isHighlighted
                        ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10'
                        : 'border-ui-border bg-ui-surface',
                ].join(' ')}
            >
                {/* Drag handle */}
                <div
                    {...listeners}
                    className="shrink-0 cursor-grab text-ui-text-muted active:cursor-grabbing"
                >
                    <Bars3Icon className="h-3.5 w-3.5" />
                </div>

                {/* Thumbnail 60×80 */}
                <div
                    className="shrink-0 overflow-hidden rounded bg-ui-surface-hover"
                    style={{ width: 60, height: 80 }}
                >
                    {thumbUrl ? (
                        <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            {file?.kind === 'image' ? (
                                <PhotoIcon className="h-5 w-5 text-ui-text-muted" />
                            ) : (
                                <DocumentIcon className="h-5 w-5 text-ui-text-muted" />
                            )}
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ui-text">{file?.name ?? '—'}</p>
                    {file?.kind === 'pdf' && (
                        <p className="mt-0.5 text-[11px] font-semibold text-ui-accent">
                            Pagina {fp.pageNum}
                        </p>
                    )}
                </div>

                {/* Delete hover-reveal */}
                <button
                    onClick={onRemove}
                    className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-colors hover:bg-red-600 group-hover:flex"
                >
                    <XMarkIcon className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

export function FinalDocument({ finalPages, files, selectedFileId, onReorder, onRemove }: Props) {
    const fileMap = new Map(files.map((f) => [f.id, f]));
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
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-ui-border px-4 py-3">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-ui-text-muted">
                    Documento finale
                </h2>
                {finalPages.length > 0 && (
                    <span className="rounded-full bg-ui-surface-hover px-2 py-0.5 text-xs font-medium text-ui-text-muted">
                        {finalPages.length} pag
                    </span>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {finalPages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-ui-text-muted">
                        <DocumentIcon className="h-8 w-8 opacity-25" />
                        <p className="text-center text-xs">Nessuna pagina selezionata</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={finalPages.map((fp) => fp.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="flex flex-col gap-3">
                                {finalPages.map((fp, i) => (
                                    <FinalPageRow
                                        key={fp.id}
                                        fp={fp}
                                        file={fileMap.get(fp.fileId)}
                                        index={i}
                                        selectedFileId={selectedFileId}
                                        onRemove={() => onRemove(fp.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
