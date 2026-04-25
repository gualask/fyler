import {
    IconChevronLeft,
    IconChevronRight,
    IconFilePlus,
    IconTrash,
    IconUpload,
} from '@tabler/icons-react';
import { useState } from 'react';
import type { SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { ClearFilesDialog } from './ClearFilesDialog';
import { FileRow } from './FileRow';
import { type FileListScrollState, useFileListScroll } from './file-list-scroll.hook';

interface Props {
    files: SourceFile[];
    selectedId: string | null;
    selectedScrollKey?: number;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    onAddFiles: () => void;
    onClearFiles: () => void;
}

export function FileList({
    files,
    selectedId,
    selectedScrollKey,
    onSelect,
    onRemove,
    onAddFiles,
    onClearFiles,
}: Props) {
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const scrollState = useFileListScroll(selectedId, selectedScrollKey);

    const closeClearConfirm = () => setIsClearConfirmOpen(false);
    const confirmClearFiles = () => {
        setIsClearConfirmOpen(false);
        onClearFiles();
    };

    return (
        <>
            <div className="flex h-full flex-col overflow-hidden">
                <FileListHeader
                    fileCount={files.length}
                    onAddFiles={onAddFiles}
                    onOpenClearConfirm={() => setIsClearConfirmOpen(true)}
                />

                <div className="file-list-body section-body">
                    {files.length === 0 ? (
                        <EmptyFileList />
                    ) : (
                        <FileScroller
                            files={files}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onRemove={onRemove}
                            scrollState={scrollState}
                        />
                    )}
                </div>
            </div>

            <ClearFilesDialog
                open={isClearConfirmOpen}
                onClose={closeClearConfirm}
                onConfirm={confirmClearFiles}
            />
        </>
    );
}

interface FileListHeaderProps {
    fileCount: number;
    onAddFiles: () => void;
    onOpenClearConfirm: () => void;
}

function FileListHeader({ fileCount, onAddFiles, onOpenClearConfirm }: FileListHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="section-header file-list-header">
            <span className="file-list-title">
                {t('fileList.sectionTitle', { count: fileCount })}
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
                    onClick={onOpenClearConfirm}
                    title={t('fileList.clearFilesTitle')}
                    disabled={fileCount === 0}
                    className="file-list-action file-list-action-clear"
                >
                    <IconTrash className="h-4 w-4" />
                    {t('fileList.clearAll')}
                </button>
            </div>
        </div>
    );
}

function EmptyFileList() {
    const { t } = useTranslation();

    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-ui-text-muted">
            <IconUpload className="h-8 w-8 opacity-25" />
            <p className="text-center text-xs">{t('fileList.empty')}</p>
        </div>
    );
}

interface FileScrollerProps {
    files: SourceFile[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onRemove: (id: string) => void;
    scrollState: FileListScrollState;
}

function FileScroller({ files, selectedId, onSelect, onRemove, scrollState }: FileScrollerProps) {
    const { t } = useTranslation();

    return (
        <>
            <div ref={scrollState.setScrollerEl} className="file-list-scroller">
                <div ref={scrollState.setWrapEl} className="file-list-wrap">
                    {files.map((file) => (
                        <div key={file.id} className="w-60 shrink-0" data-source-file-id={file.id}>
                            <FileRow
                                file={file}
                                selected={file.id === selectedId}
                                onSelect={() => onSelect(file.id)}
                                onRemove={() => onRemove(file.id)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <button
                type="button"
                className="file-list-nav-btn file-list-nav-left"
                onClick={() => scrollState.scrollByCard(-1)}
                disabled={!scrollState.canScrollLeft}
                aria-label={t('fileList.scrollLeft')}
                title={t('fileList.scrollLeft')}
            >
                <IconChevronLeft className="h-4 w-4" />
            </button>
            <button
                type="button"
                className="file-list-nav-btn file-list-nav-right"
                onClick={() => scrollState.scrollByCard(1)}
                disabled={!scrollState.canScrollRight}
                aria-label={t('fileList.scrollRight')}
                title={t('fileList.scrollRight')}
            >
                <IconChevronRight className="h-4 w-4" />
            </button>
        </>
    );
}
