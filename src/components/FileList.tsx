import { useMemo } from 'react';
import { ArrowUpTrayIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import type { SourceFile, FinalPage } from '../domain';
import { FileRow } from './FileRow';

interface Props {
    files: SourceFile[];
    finalPages: FinalPage[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onAddFiles: () => void;
}

export function FileList({ files, finalPages, selectedId, onSelect, onRemove, onAddFiles }: Props) {
    const pageCountByFile = useMemo(() => {
        const map = new Map<string, number>();
        for (const fp of finalPages) {
            map.set(fp.fileId, (map.get(fp.fileId) ?? 0) + 1);
        }
        return map;
    }, [finalPages]);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-ui-border px-4 py-3">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-ui-text-muted">
                    File ({files.length})
                </h2>
                <button
                    onClick={onAddFiles}
                    title="Aggiungi file"
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-ui-accent transition-colors hover:bg-ui-accent/10"
                >
                    <DocumentPlusIcon className="h-4 w-4" />
                    Aggiungi
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {files.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-ui-text-muted">
                        <ArrowUpTrayIcon className="h-8 w-8 opacity-25" />
                        <p className="text-center text-xs">Trascina file o clicca Aggiungi</p>
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
