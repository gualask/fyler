import { memo } from 'react';
import { useTranslation } from '@/shared/i18n';
import type { ListItem } from '../list-item.types';
import { FinalDocumentRowShell } from './FinalDocumentRowShell';
import { ListRowThumbnail } from './ListRowThumbnail';

interface Props {
    item: ListItem;
    isFirst: boolean;
    isLast: boolean;
    scrollRoot: HTMLDivElement | null;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: (id: string) => void;
    onSelect: () => void;
    onPreview: () => void;
    flashKey?: number;
}

export const ListRow = memo(function ListRow({
    item,
    isFirst,
    isLast,
    scrollRoot,
    onMoveUp,
    onMoveDown,
    onRemove,
    onSelect,
    onPreview,
    flashKey,
}: Props) {
    const { t } = useTranslation();

    return (
        <FinalDocumentRowShell
            item={item}
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemove={onRemove}
            onSelect={onSelect}
            flashKey={flashKey}
            flashOverlayClassName="inset-0 rounded-xl"
            cardClassName={[
                'group relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                item.isSelected
                    ? 'border-ui-accent bg-ui-surface'
                    : 'border-ui-border bg-ui-surface',
            ].join(' ')}
        >
            <ListRowThumbnail item={item} scrollRoot={scrollRoot} onPreview={onPreview} />

            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ui-text">{item.file?.name ?? '—'}</p>
                {item.file?.kind === 'pdf' ? (
                    <p className="mt-0.5 text-[11px] font-semibold text-ui-kind-pdf">
                        {t('finalDocument.pageLabel', { pageNum: item.page.pageNum })}
                    </p>
                ) : item.file?.kind === 'image' ? (
                    <p className="mt-0.5 text-[11px] font-semibold text-ui-kind-image">
                        {t('finalDocument.imageLabel')}
                    </p>
                ) : null}
            </div>
        </FinalDocumentRowShell>
    );
});
