import { IconFilePlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { useMemo } from 'react';
import type { FinalPage, SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { ColumnHeader } from '@/shared/ui/layout/ColumnHeader';
import { FileRow } from './FileRow';

interface Props {
    files: SourceFile[];
    finalPages: FinalPage[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onAddFiles: () => void;
    onClearFiles: () => void;
}

export function FileList({
    files,
    finalPages,
    selectedId,
    onSelect,
    onRemove,
    onAddFiles,
    onClearFiles,
}: Props) {
    const { t } = useTranslation();
    const pageCountByFile = useMemo(() => {
        const map = new Map<string, number>();
        for (const fp of finalPages) {
            map.set(fp.fileId, (map.get(fp.fileId) ?? 0) + 1);
        }
        return map;
    }, [finalPages]);

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
                    onClick={onClearFiles}
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
                                usedPages={pageCountByFile.get(f.id) ?? 0}
                                selected={f.id === selectedId}
                                onSelect={() => onSelect(f.id)}
                                onRemove={() => onRemove(f.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
