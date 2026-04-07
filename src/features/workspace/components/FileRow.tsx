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
            className={['group file-row', selected ? 'file-row-selected' : 'file-row-idle'].join(
                ' ',
            )}
        >
            <div className="flex items-start gap-2.5">
                {file.kind === 'image' ? (
                    <IconPhoto className="mt-0.5 h-4 w-4 shrink-0 text-ui-kind-image" />
                ) : (
                    <IconFileTypePdf className="mt-0.5 h-4 w-4 shrink-0 text-ui-kind-pdf" />
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
                                className="file-row-title"
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
                    <p className="file-row-meta">
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
                            'btn-icon h-7 w-7 hover:text-ui-danger transition-opacity',
                            selected
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                        ].join(' ')}
                        title={t('fileList.remove')}
                    >
                        <IconTrash className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
