import { ChevronRightIcon, DocumentIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { SourceFile } from '../domain';
import { useTranslation } from '../i18n';

interface Props {
    file: SourceFile;
    usedPages: number;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
}

export function FileRow({ file, usedPages, selected, onSelect, onRemove }: Props) {
    const { t, tp } = useTranslation();

    return (
        <div
            onClick={onSelect}
            className={[
                'group cursor-pointer select-none rounded-xl p-3 transition-colors',
                selected
                    ? 'border border-ui-accent/30 bg-ui-accent-soft'
                    : 'border border-transparent hover:bg-ui-surface-hover',
            ].join(' ')}
        >
            <div className="flex items-start gap-3">
                {file.kind === 'image' ? (
                    <PhotoIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                ) : (
                    <DocumentIcon className="mt-0.5 h-5 w-5 shrink-0 text-ui-accent" />
                )}

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ui-text">{file.name}</p>
                    <p className="mt-0.5 text-[11px] text-ui-text-muted">
                        {t('fileList.pageCount', { count: file.kind === 'image' ? 1 : file.pageCount })}
                    </p>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-ui-text-muted opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                    style={{ opacity: selected ? 0.6 : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
                    title={t('fileList.remove')}
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
            </div>

            {selected && (
                <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-ui-accent-text">
                    <span>
                        {file.kind === 'image'
                            ? usedPages > 0
                                ? t('fileList.imageIncluded')
                                : t('fileList.imageNotIncluded')
                            : tp('fileList.usedPages', usedPages)}
                    </span>
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                </div>
            )}
        </div>
    );
}
