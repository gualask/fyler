import { IconFileDownload, IconFileTypePdf, IconPhoto, IconX } from '@tabler/icons-react';
import type { SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { formatByteSize } from '@/shared/ui/format/byte-size';
import { DragOverlay } from '../components/DragOverlay';

interface Props {
    files: SourceFile[];
    quickAddFileOrder: readonly string[];
    isTransitioning: boolean;
    isDragOver: boolean;
    onRemove: (id: string) => void;
    onExit: () => void;
}

export function QuickAddView({
    files,
    quickAddFileOrder,
    isTransitioning,
    isDragOver,
    onRemove,
    onExit,
}: Props) {
    const { locale, t } = useTranslation();
    const filesById = new Map(files.map((file) => [file.id, file]));
    const addedFiles = quickAddFileOrder
        .map((id) => filesById.get(id))
        .filter((file): file is SourceFile => Boolean(file));
    const hasAddedFiles = addedFiles.length > 0;

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            {isDragOver && <DragOverlay />}

            <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-4">
                <div className="flex items-center gap-2.5">
                    <img src="/icon.svg" alt="Fyler" className="h-6 w-6" />
                    <span className="text-sm font-semibold text-ui-text">
                        {t('header.quickAdd')}
                    </span>
                </div>
                <button
                    type="button"
                    disabled={isTransitioning}
                    onClick={onExit}
                    className="btn-icon"
                    aria-label={t('quickAdd.close')}
                    title={t('quickAdd.close')}
                >
                    <IconX className="h-4 w-4" />
                </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
                {!hasAddedFiles ? (
                    <section className="min-h-28 flex-1 rounded-xl border-2 border-dashed border-ui-border bg-ui-surface px-6 py-8">
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ui-surface-subtle text-ui-text-secondary">
                                <IconFileDownload className="h-6 w-6" />
                            </div>

                            <div className="mt-4 flex max-w-sm flex-col gap-1.5">
                                <p className="text-base font-semibold text-ui-text">
                                    {t('quickAdd.dragFiles')}
                                </p>
                                <p className="text-sm leading-6 text-ui-text-muted">
                                    {t('quickAdd.hint')}
                                </p>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="shrink-0 rounded-xl border-2 border-dashed border-ui-border bg-ui-surface px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ui-surface-subtle text-ui-text-secondary">
                                <IconFileDownload className="h-5 w-5" />
                            </div>
                            <p className="min-w-0 text-sm font-medium text-ui-text">
                                {t('quickAdd.dragMoreFiles')}
                            </p>
                        </div>
                    </section>
                )}

                {hasAddedFiles ? (
                    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm">
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {addedFiles.map((file) => {
                                const fileSize = formatByteSize(file.byteSize, locale);

                                return (
                                    <div
                                        key={file.id}
                                        className="group flex items-center gap-2.5 border-b border-ui-border/70 px-3 py-2 last:border-b-0 hover:bg-ui-surface-subtle"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ui-surface-subtle">
                                            {file.kind === 'pdf' ? (
                                                <IconFileTypePdf className="h-4 w-4 text-ui-kind-pdf" />
                                            ) : (
                                                <IconPhoto className="h-4 w-4 text-ui-kind-image" />
                                            )}
                                        </div>

                                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ui-text">
                                            {file.name}
                                        </p>
                                        <span className="shrink-0 text-xs text-ui-text-muted">
                                            {fileSize}
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
                            })}
                        </div>
                    </section>
                ) : null}

                <div className="flex shrink-0 pt-0.5">
                    <button
                        type="button"
                        disabled={isTransitioning}
                        onClick={onExit}
                        className="btn-primary w-full justify-center"
                    >
                        {t('quickAdd.done')}
                    </button>
                </div>
            </div>
        </div>
    );
}
