import { IconFilePlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { ColumnHeader } from '@/shared/ui/layout/ColumnHeader';
import { FileRow } from './FileRow';

interface Props {
    files: SourceFile[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onAddFiles: () => void;
    onClearFiles: () => void;
}

export function FileList({
    files,
    selectedId,
    onSelect,
    onRemove,
    onAddFiles,
    onClearFiles,
}: Props) {
    const { t } = useTranslation();
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    useEffect(() => {
        if (!isClearConfirmOpen) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsClearConfirmOpen(false);
        };
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, [isClearConfirmOpen]);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <ColumnHeader title={t('fileList.title', { count: files.length })}>
                <button
                    type="button"
                    onClick={onAddFiles}
                    title={t('fileList.addFilesTitle')}
                    className="btn-ghost-sm h-[34px]"
                >
                    <IconFilePlus className="h-4 w-4" />
                    {t('fileList.add')}
                </button>
                <button
                    type="button"
                    onClick={() => setIsClearConfirmOpen(true)}
                    title={t('fileList.clearFilesTitle')}
                    disabled={files.length === 0}
                    className="btn-ghost-sm h-[34px]"
                >
                    <IconTrash className="h-4 w-4" />
                    {t('fileList.clear')}
                </button>
            </ColumnHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {files.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-ui-text-muted">
                        <IconUpload className="h-8 w-8 opacity-25" />
                        <p className="text-center text-xs">{t('fileList.empty')}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {files.map((f) => (
                            <FileRow
                                key={f.id}
                                file={f}
                                selected={f.id === selectedId}
                                onSelect={() => onSelect(f.id)}
                                onRemove={() => onRemove(f.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {isClearConfirmOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setIsClearConfirmOpen(false);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl border border-ui-border bg-ui-surface shadow-2xl">
                        <div className="border-b border-ui-border px-6 py-5">
                            <h2 className="text-lg font-semibold text-ui-text">
                                {t('fileList.clearConfirmTitle')}
                            </h2>
                            <p className="mt-1 text-sm text-ui-text-muted">
                                {t('fileList.clearConfirmBody')}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4">
                            <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => setIsClearConfirmOpen(false)}
                            >
                                {t('fileList.clearConfirmCancel')}
                            </button>
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-lg bg-ui-danger px-5 py-2 text-sm font-semibold text-white shadow-md transition-[colors,transform] hover:bg-ui-danger-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-danger/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ui-surface"
                                onClick={() => {
                                    setIsClearConfirmOpen(false);
                                    onClearFiles();
                                }}
                            >
                                {t('fileList.clearConfirmOk')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
