import { IconFilePlus, IconTrash } from '@tabler/icons-react';
import { useId, useState } from 'react';

import { useTranslation } from '@/shared/i18n';
import type { BatchSource } from '../../model';
import { BatchSourceRow } from './BatchSourceRow';

export function BatchSourceList({
    sources,
    busy,
    onAddFiles,
    onClear,
    onRemove,
}: {
    sources: BatchSource[];
    busy: boolean;
    onAddFiles: () => void;
    onClear: () => void;
    onRemove: (sourceId: string) => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const [scrollRoot, setScrollRoot] = useState<HTMLUListElement | null>(null);
    return (
        <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-labelledby={titleId}>
            <div className="section-header file-list-header border-b border-ui-border">
                <span id={titleId} className="file-list-title">
                    {t('fileList.sectionTitle', { count: sources.length })}
                </span>
                <div className="file-list-header-actions">
                    <button
                        type="button"
                        onClick={onAddFiles}
                        title={t('fileList.addFilesTitle')}
                        disabled={busy}
                        className="file-list-action file-list-action-add"
                    >
                        <IconFilePlus className="h-4 w-4" />
                        {t('fileList.addFiles')}
                    </button>
                    <button
                        type="button"
                        onClick={onClear}
                        title={t('fileList.clearFilesTitle')}
                        disabled={busy || sources.length === 0}
                        className="file-list-action file-list-action-clear"
                    >
                        <IconTrash className="h-4 w-4" />
                        {t('fileList.clearAll')}
                    </button>
                </div>
            </div>
            <ul ref={setScrollRoot} className="min-h-0 flex-1 overflow-y-auto">
                {sources.map((source) => (
                    <BatchSourceRow
                        key={source.id}
                        source={source}
                        busy={busy}
                        scrollRoot={scrollRoot}
                        onRemove={() => onRemove(source.id)}
                    />
                ))}
            </ul>
        </section>
    );
}
