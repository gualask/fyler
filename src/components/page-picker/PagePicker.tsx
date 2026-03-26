import { useState } from 'react';

import type { FileEdits, FinalPage, SourceFile } from '@/domain';
import type { RotationDirection } from '@/domain/file-edits';
import { useTranslation } from '@/i18n';
import { PreviewModal } from '../preview/PreviewModal';
import { ColumnHeader } from '../shared/layout/ColumnHeader';
import { ImagePanel } from './panels/ImagePanel';
import { PdfPanel } from './panels/PdfPanel';

interface Props {
    file: SourceFile | null;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onToggleRange: (fileId: string, from: number, to: number) => void;
    onSetPages: (fileId: string, pages: number[]) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
    onRotatePage: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    editsByFile: Record<string, FileEdits>;
    focusedPageNum: number | null;
    focusFlashKey?: number;
}

export function PagePicker({
    file,
    finalPages,
    onTogglePage,
    onToggleRange,
    onSetPages,
    onSelectAll,
    onDeselectAll,
    onRotatePage,
    editsByFile,
    focusedPageNum,
    focusFlashKey,
}: Props) {
    const { t } = useTranslation();
    const [previewTarget, setPreviewTarget] = useState<FinalPage | null>(null);

    if (!file) {
        return (
            <div className="flex h-full flex-col overflow-hidden">
                <ColumnHeader title={t('pagePicker.title')} />
                <div className="flex min-h-0 flex-1 items-center justify-center text-ui-text-muted">
                    <p className="text-xs">{t('pagePicker.selectAFile')}</p>
                </div>
            </div>
        );
    }

    if (file.kind === 'image') {
        return (
            <>
                <ImagePanel
                    file={file}
                    editsByFile={editsByFile}
                    focusedPageNum={focusedPageNum}
                    focusFlashKey={focusFlashKey}
                    onRotatePage={onRotatePage}
                    onPreview={() =>
                        setPreviewTarget({ id: `${file.id}:0`, fileId: file.id, pageNum: 0 })
                    }
                />

                {previewTarget && (
                    <PreviewModal
                        finalPages={[previewTarget]}
                        files={[file]}
                        editsByFile={editsByFile}
                        indicator={{ total: 1, mode: 'page-num' }}
                        onRotatePage={onRotatePage}
                        onClose={() => setPreviewTarget(null)}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <PdfPanel
                file={file}
                finalPages={finalPages}
                onTogglePage={onTogglePage}
                onToggleRange={onToggleRange}
                onSetPages={onSetPages}
                onSelectAll={onSelectAll}
                onDeselectAll={onDeselectAll}
                onRotatePage={onRotatePage}
                editsByFile={editsByFile}
                focusedPageNum={focusedPageNum}
                focusFlashKey={focusFlashKey}
                onPreview={(pageNum) =>
                    setPreviewTarget({ id: `${file.id}:${pageNum}`, fileId: file.id, pageNum })
                }
            />

            {previewTarget && (
                <PreviewModal
                    finalPages={[previewTarget]}
                    files={[file]}
                    editsByFile={editsByFile}
                    indicator={{ total: file.pageCount, mode: 'page-num' }}
                    onRotatePage={onRotatePage}
                    onClose={() => setPreviewTarget(null)}
                />
            )}
        </>
    );
}
