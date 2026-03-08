import { memo, useCallback, useMemo, useState } from 'react';
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
import type { FileEdits, FinalPage, SourceFile } from '../domain';
import type { RotationDirection } from '../fileEdits';
import { emptyFileEdits, getImageRotationDegrees } from '../fileEdits';
import { usePdfCache } from '../hooks/usePdfCache';
import { buildThumbnailRenderRequest } from '../pdfRenderProfiles';
import { getPreviewUrl } from '../platform';
import { PageQuickActions } from './PageQuickActions';
import { PreviewModal } from './PreviewModal';

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedFileId: string | null;
    onReorder: (fromId: string, toId: string) => void;
    onRemove: (id: string) => void;
    onRotatePage: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    editsByFile: Record<string, FileEdits>;
}

const FinalPageRow = memo(function FinalPageRow({
    fp,
    file,
    edits,
    index,
    isHighlighted,
    onRemove,
    onPreview,
    onRotate,
}: {
    fp: FinalPage;
    file: SourceFile | undefined;
    edits: FileEdits;
    index: number;
    isHighlighted: boolean;
    onRemove: (id: string) => void;
    onPreview: () => void;
    onRotate: (direction: RotationDirection) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: fp.id,
    });
    const { getRender } = usePdfCache();

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

    const thumbUrl =
        file?.kind === 'pdf' ? getRender(fp.fileId, buildThumbnailRenderRequest(fp.pageNum, edits)) : null;
    const imageUrl = file?.kind === 'image' ? getPreviewUrl(file.originalPath) : null;
    const imageRotation = file?.kind === 'image' ? getImageRotationDegrees(edits) : 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={['flex min-w-0 items-center gap-3', isDragging ? 'opacity-50' : ''].join(' ')}
        >
            <span className="w-4 shrink-0 text-center text-xs font-bold text-ui-text-muted">
                {index + 1}
            </span>

            <div
                className={[
                    'group relative flex min-w-0 flex-1 items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                    isHighlighted
                        ? 'border-ui-accent/50 bg-ui-surface'
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
                    className="group relative shrink-0 overflow-hidden rounded bg-ui-surface-hover"
                    style={{ width: 60, height: 80 }}
                >
                    {thumbUrl ? (
                        <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : imageUrl ? (
                        <img
                            src={imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            style={{ transform: `rotate(${imageRotation}deg)` }}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center">
                            {file?.kind === 'image' ? (
                                <PhotoIcon className="h-5 w-5 text-ui-text-muted" />
                            ) : (
                                <DocumentIcon className="h-5 w-5 text-ui-text-muted" />
                            )}
                        </div>
                    )}
                    <PageQuickActions
                        compact
                        onPreview={onPreview}
                        onRotateLeft={() => onRotate('ccw')}
                        onRotateRight={() => onRotate('cw')}
                    />
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
                    onClick={() => onRemove(fp.id)}
                    className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-colors hover:bg-red-600 group-hover:flex"
                >
                    <XMarkIcon className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
});

export function FinalDocument({ finalPages, files, selectedFileId, onReorder, onRemove, onRotatePage, editsByFile }: Props) {
    const fileMap = useMemo(() => new Map(files.map((f) => [f.id, f])), [files]);
    const sortableItems = useMemo(() => finalPages.map((fp) => fp.id), [finalPages]);
    const [previewTarget, setPreviewTarget] = useState<FinalPage | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onReorder(String(active.id), String(over.id));
        }
    }, [onReorder]);

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
                            items={sortableItems}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="flex flex-col gap-3">
                                {finalPages.map((fp, i) => (
                                    <FinalPageRow
                                        key={fp.id}
                                        fp={fp}
                                        file={fileMap.get(fp.fileId)}
                                        edits={editsByFile[fp.fileId] ?? emptyFileEdits()}
                                        index={i}
                                        isHighlighted={fp.fileId === selectedFileId}
                                        onRemove={onRemove}
                                        onPreview={() => setPreviewTarget(fp)}
                                        onRotate={(direction) => void onRotatePage(fp.fileId, fp.pageNum, direction)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {previewTarget && (
                <PreviewModal
                    finalPages={[previewTarget]}
                    files={files}
                    editsByFile={editsByFile}
                    onRotatePage={(pageNum, direction) => onRotatePage(previewTarget.fileId, pageNum, direction)}
                    onClose={() => setPreviewTarget(null)}
                />
            )}
        </div>
    );
}
