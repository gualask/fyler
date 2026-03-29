import { IconChevronRight, IconFile, IconPhoto, IconTrash } from '@tabler/icons-react';
import type { SourceFile } from '@/domain';
import { useTranslation } from '@/i18n';
import { Tooltip } from './shared/feedback/Tooltip';

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
                    <IconPhoto className="mt-0.5 h-5 w-5 shrink-0 text-ui-text-muted" />
                ) : (
                    <IconFile className="mt-0.5 h-5 w-5 shrink-0 text-ui-accent" />
                )}

                <div className="min-w-0 flex-1">
                    <Tooltip
                        className="block min-w-0"
                        panelClassName="w-max max-w-full px-2 py-1 text-xs font-medium text-ui-text"
                        renderTrigger={({
                            ariaDescribedBy,
                            ariaExpanded,
                            onFocus,
                            onBlur,
                            onClick,
                        }) => (
                            <button
                                type="button"
                                className="block w-full truncate bg-transparent p-0 text-left text-sm font-semibold text-ui-text"
                                aria-describedby={ariaDescribedBy}
                                aria-expanded={ariaExpanded}
                                onFocus={onFocus}
                                onBlur={onBlur}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onSelect();
                                    onClick();
                                }}
                            >
                                {file.name}
                            </button>
                        )}
                    >
                        <span className="block [overflow-wrap:anywhere]">{file.name}</span>
                    </Tooltip>
                    <p className="mt-0.5 text-[11px] text-ui-text-muted">
                        {t('fileList.pageCount', {
                            count: file.kind === 'image' ? 1 : file.pageCount,
                        })}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-ui-text-muted opacity-0 transition-all hover:text-ui-danger group-hover:opacity-100"
                    style={{ opacity: selected ? 0.6 : undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
                    title={t('fileList.remove')}
                >
                    <IconTrash className="h-3.5 w-3.5" />
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
                    <IconChevronRight className="h-3.5 w-3.5" />
                </div>
            )}
        </div>
    );
}
