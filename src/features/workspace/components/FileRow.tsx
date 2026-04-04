import { IconFileTypePdf, IconPhoto, IconTrash } from '@tabler/icons-react';
import type { SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { Tooltip } from '@/shared/ui/feedback/Tooltip';
import { formatByteSize } from '@/shared/ui/format/byte-size';

interface Props {
    file: SourceFile;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
}

export function FileRow({ file, selected, onSelect, onRemove }: Props) {
    const { locale, t } = useTranslation();

    const fileSize = formatByteSize(file.byteSize, locale);

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
                    <IconPhoto className="mt-0.5 h-5 w-5 shrink-0 text-ui-kind-image" />
                ) : (
                    <IconFileTypePdf className="mt-0.5 h-5 w-5 shrink-0 text-ui-kind-pdf" />
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
                        <span>{fileSize}</span>
                        {file.kind === 'pdf' ? (
                            <>
                                <span className="mx-2">•</span>
                                <span>{t('fileList.pageCount', { count: file.pageCount })}</span>
                            </>
                        ) : null}
                    </p>
                </div>

                <div className="flex shrink-0 items-center self-center">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className={[
                            'btn-icon h-9 w-9 hover:text-ui-danger transition-opacity',
                            selected
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                        ].join(' ')}
                        title={t('fileList.remove')}
                    >
                        <IconTrash className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
