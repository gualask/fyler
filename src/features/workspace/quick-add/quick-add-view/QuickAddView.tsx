import type { SourceFile } from '@/shared/domain';
import { DragOverlay } from '../../components/DragOverlay';
import { QuickAddDropTarget } from './QuickAddDropTarget';
import { QuickAddFilesList } from './QuickAddFilesList';
import { QuickAddFooter } from './QuickAddFooter';
import { QuickAddHeader } from './QuickAddHeader';

interface Props {
    files: SourceFile[];
    quickAddFileOrder: readonly string[];
    disabled: boolean;
    isDragOver: boolean;
    onRemove: (id: string) => void;
    onDiscardAndExit: () => void;
    onDone: () => void;
}

export function QuickAddView({
    files,
    quickAddFileOrder,
    disabled,
    isDragOver,
    onRemove,
    onDiscardAndExit,
    onDone,
}: Props) {
    const filesById = new Map(files.map((file) => [file.id, file]));
    const addedFiles = quickAddFileOrder
        .map((id) => filesById.get(id))
        .filter((file): file is SourceFile => Boolean(file));
    const hasAddedFiles = addedFiles.length > 0;

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            {isDragOver ? <DragOverlay /> : null}
            <QuickAddHeader disabled={disabled} onDiscardAndExit={onDiscardAndExit} />

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
                <QuickAddDropTarget hasAddedFiles={hasAddedFiles} />
                {hasAddedFiles ? (
                    <QuickAddFilesList files={addedFiles} disabled={disabled} onRemove={onRemove} />
                ) : null}
                <QuickAddFooter disabled={disabled} onDone={onDone} />
            </div>
        </div>
    );
}
