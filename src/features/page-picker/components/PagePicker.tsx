import { IconFile } from '@tabler/icons-react';
import { useState } from 'react';
import { PreviewModal } from '@/features/preview';
import type {
    FileEdits,
    FinalPage,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { useTranslation } from '@/shared/i18n';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { ImagePanel } from './panels/ImagePanel';
import { PdfPanel } from './panels/PdfPanel';

interface Props {
    file: SourceFile | null;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onSetPdfPages: (fileId: string, pages: number[]) => void;
    onSetImageIncluded: (fileId: string, included: boolean) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
    onFocusTarget: (fileId: string, target: SourceTarget) => void;
    onRotateTarget: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => Promise<void>;
    editsByFile: Record<string, FileEdits>;
    focusedTarget: SourceTarget | null;
    focusFlashKey?: number;
}

export function PagePicker({
    file,
    finalPages,
    onTogglePage,
    onSetPdfPages,
    onSetImageIncluded,
    onSelectAll,
    onDeselectAll,
    onFocusTarget,
    onRotateTarget,
    editsByFile,
    focusedTarget,
    focusFlashKey,
}: Props) {
    const { t } = useTranslation();
    const [previewTarget, setPreviewTarget] = useState<FinalPage | null>(null);

    if (!file) {
        return (
            <div className="flex h-full flex-col overflow-hidden">
                <SectionHeader title={t('pagePicker.title')} className="border-b-0" />
                <div className="section-body flex min-h-0 flex-1 items-center justify-center p-6 text-ui-text-muted">
                    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-ui-border bg-ui-surface px-6 py-8 text-center shadow-sm">
                        <IconFile className="h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium text-ui-text">
                            {t('pagePicker.selectAFile')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (file.kind === 'image') {
        const isIncluded = finalPages.some(
            (page) => page.fileId === file.id && page.kind === 'image',
        );
        return (
            <>
                <ImagePanel
                    file={file}
                    editsByFile={editsByFile}
                    isFocused={focusedTarget?.kind === 'image'}
                    focusFlashKey={focusFlashKey}
                    onRotate={(direction) => onRotateTarget(file.id, { kind: 'image' }, direction)}
                    isIncluded={isIncluded}
                    onInclude={() => onSetImageIncluded(file.id, true)}
                    onFocus={() => onFocusTarget(file.id, { kind: 'image' })}
                    onPreview={() =>
                        setPreviewTarget({
                            id: toFinalPageId(file.id, { kind: 'image' }),
                            fileId: file.id,
                            kind: 'image',
                        })
                    }
                />

                {previewTarget && (
                    <PreviewModal
                        finalPages={[previewTarget]}
                        files={[file]}
                        editsByFile={editsByFile}
                        indicator={{ total: 1, mode: 'page-num' }}
                        onRotatePage={onRotateTarget}
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
                onSetPdfPages={onSetPdfPages}
                onSelectAll={onSelectAll}
                onDeselectAll={onDeselectAll}
                onFocusTarget={onFocusTarget}
                onRotatePage={(fileId, pageNum, direction) =>
                    onRotateTarget(fileId, { kind: 'pdf', pageNum }, direction)
                }
                editsByFile={editsByFile}
                focusedPageNum={focusedTarget?.kind === 'pdf' ? focusedTarget.pageNum : null}
                focusFlashKey={focusFlashKey}
                onPreview={(pageNum) =>
                    setPreviewTarget({
                        id: toFinalPageId(file.id, { kind: 'pdf', pageNum }),
                        fileId: file.id,
                        kind: 'pdf',
                        pageNum,
                    })
                }
            />

            {previewTarget && (
                <PreviewModal
                    finalPages={[previewTarget]}
                    files={[file]}
                    editsByFile={editsByFile}
                    indicator={{ total: file.pageCount ?? 1, mode: 'page-num' }}
                    onRotatePage={onRotateTarget}
                    onClose={() => setPreviewTarget(null)}
                />
            )}
        </>
    );
}
