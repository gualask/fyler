import { IconFileTypePdf, IconPhoto, IconX } from '@tabler/icons-react';
import type { SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { formatByteSize } from '@/shared/ui/format/byte-size';

interface QuickAddFilesListProps {
    files: SourceFile[];
    isTransitioning: boolean;
    onRemove: (id: string) => void;
}

export function QuickAddFilesList({ files, isTransitioning, onRemove }: QuickAddFilesListProps) {
    return (
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
            <div className="min-h-0 flex-1 overflow-y-auto">
                {files.map((file) => (
                    <QuickAddFileRow
                        key={file.id}
                        file={file}
                        isTransitioning={isTransitioning}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </section>
    );
}

function QuickAddFileRow({
    file,
    isTransitioning,
    onRemove,
}: {
    file: SourceFile;
    isTransitioning: boolean;
    onRemove: (id: string) => void;
}) {
    const { locale, t } = useTranslation();

    return (
        <div className="group flex items-center gap-2.5 border-b border-ui-border/70 px-3 py-2 last:border-b-0 hover:bg-ui-surface-subtle">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ui-surface-subtle">
                {file.kind === 'pdf' ? (
                    <IconFileTypePdf className="h-4 w-4 text-ui-kind-pdf" />
                ) : (
                    <IconPhoto className="h-4 w-4 text-ui-kind-image" />
                )}
            </div>

            <p className="min-w-0 flex-1 truncate text-sm font-medium text-ui-text">{file.name}</p>
            <span className="shrink-0 text-xs text-ui-text-muted">
                {formatByteSize(file.byteSize, locale)}
            </span>

            <button
                type="button"
                disabled={isTransitioning}
                onClick={() => onRemove(file.id)}
                className="btn-icon h-7 w-7 rounded-md transition-colors hover:text-ui-danger"
                aria-label={t('quickAdd.remove')}
                title={t('quickAdd.remove')}
            >
                <IconX className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
