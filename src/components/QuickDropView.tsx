import { DocumentArrowDownIcon, DocumentIcon, PhotoIcon, XMarkIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import type { SourceFile } from '../domain';
import { useTranslation } from '../i18n';
import { DragOverlay } from './DragOverlay';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
    files: SourceFile[];
    quickDropFileIds: Set<string>;
    isDragOver: boolean;
    onRemove: (id: string) => void;
    onExit: () => void;
}

export function QuickDropView({ files, quickDropFileIds, isDragOver, onRemove, onExit }: Props) {
    const { t } = useTranslation();
    const addedFiles = files.filter((f) => quickDropFileIds.has(f.id));

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            {isDragOver && <DragOverlay />}
            {/* Header */}
            <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-ui-accent text-white shadow-sm">
                        <Squares2X2Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold">{t('header.quickDrop')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <button onClick={onExit} className="btn-icon" title={t('quickDrop.close')}>
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Drop area */}
            <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ui-border bg-ui-surface min-h-28">
                    <DocumentArrowDownIcon className="h-10 w-10 text-ui-text-muted" />
                    <p className="text-center text-sm text-ui-text-muted">{t('quickDrop.dragFiles')}</p>
                </div>

                {/* File list */}
                {addedFiles.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium text-ui-text-muted">
                            {t('quickDrop.addedCount', { count: addedFiles.length })}
                        </p>
                        <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto rounded-lg border border-ui-border bg-ui-surface">
                            {addedFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-ui-bg"
                                >
                                    {file.kind === 'pdf' ? (
                                        <DocumentIcon className="h-4 w-4 shrink-0 text-ui-accent" />
                                    ) : (
                                        <PhotoIcon className="h-4 w-4 shrink-0 text-slate-400" />
                                    )}
                                    <span className="flex-1 truncate text-xs">{file.name}</span>
                                    <button
                                        onClick={() => onRemove(file.id)}
                                        className="shrink-0 text-ui-text-muted transition-colors hover:text-red-500"
                                        title={t('quickDrop.remove')}
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Done button */}
                <button onClick={onExit} className="btn-primary w-full justify-center py-3">
                    {t('quickDrop.done')}
                </button>
            </div>
        </div>
    );
}
