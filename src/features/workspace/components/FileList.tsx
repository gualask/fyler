import {
    IconChevronLeft,
    IconChevronRight,
    IconFilePlus,
    IconTrash,
    IconUpload,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
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
    const [scrollerEl, setScrollerEl] = useState<HTMLDivElement | null>(null);
    const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        if (!isClearConfirmOpen) return;
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsClearConfirmOpen(false);
        };
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, [isClearConfirmOpen]);

    useEffect(() => {
        if (!scrollerEl) return;

        const sync = () => {
            const maxScrollLeft = scrollerEl.scrollWidth - scrollerEl.clientWidth;
            const hasOverflow = maxScrollLeft > 1;
            if (!hasOverflow) {
                setCanScrollLeft(false);
                setCanScrollRight(false);
                return;
            }

            setCanScrollLeft(scrollerEl.scrollLeft > 0);
            setCanScrollRight(scrollerEl.scrollLeft < maxScrollLeft - 1);
        };

        sync();

        const onScroll = () => sync();
        scrollerEl.addEventListener('scroll', onScroll, { passive: true });

        const ro = new ResizeObserver(() => sync());
        ro.observe(scrollerEl);
        if (wrapEl) ro.observe(wrapEl);

        return () => {
            scrollerEl.removeEventListener('scroll', onScroll);
            ro.disconnect();
        };
    }, [scrollerEl, wrapEl]);

    const scrollByCard = (direction: -1 | 1) => {
        if (!scrollerEl) return;
        const step = 240 + 8; // w-60 + gap-2
        scrollerEl.scrollBy({ left: direction * step, behavior: 'smooth' });
    };

    return (
        <>
            <div className="flex h-full flex-col overflow-hidden">
                <div className="section-header file-list-header">
                    <span className="file-list-title">
                        {t('fileList.sectionTitle', { count: files.length })}
                    </span>
                    <div className="file-list-header-actions">
                        <button
                            type="button"
                            onClick={onAddFiles}
                            title={t('fileList.addFilesTitle')}
                            className="file-list-action file-list-action-add"
                        >
                            <IconFilePlus className="h-4 w-4" />
                            {t('fileList.addFiles')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsClearConfirmOpen(true)}
                            title={t('fileList.clearFilesTitle')}
                            disabled={files.length === 0}
                            className="file-list-action file-list-action-clear"
                        >
                            <IconTrash className="h-4 w-4" />
                            {t('fileList.clearAll')}
                        </button>
                    </div>
                </div>

                <div className="file-list-body section-body">
                    {files.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-ui-text-muted">
                            <IconUpload className="h-8 w-8 opacity-25" />
                            <p className="text-center text-xs">{t('fileList.empty')}</p>
                        </div>
                    ) : (
                        <>
                            <div ref={setScrollerEl} className="file-list-scroller">
                                <div ref={setWrapEl} className="file-list-wrap">
                                    {files.map((f) => (
                                        <div key={f.id} className="w-60 shrink-0">
                                            <FileRow
                                                file={f}
                                                selected={f.id === selectedId}
                                                onSelect={() => onSelect(f.id)}
                                                onRemove={() => onRemove(f.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="file-list-nav-btn file-list-nav-left"
                                onClick={() => scrollByCard(-1)}
                                disabled={!canScrollLeft}
                                aria-label={t('fileList.scrollLeft')}
                                title={t('fileList.scrollLeft')}
                            >
                                <IconChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                className="file-list-nav-btn file-list-nav-right"
                                onClick={() => scrollByCard(1)}
                                disabled={!canScrollRight}
                                aria-label={t('fileList.scrollRight')}
                                title={t('fileList.scrollRight')}
                            >
                                <IconChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
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
        </>
    );
}
