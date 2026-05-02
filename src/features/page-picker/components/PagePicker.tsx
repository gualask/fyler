import { IconFile } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
    FileEdits,
    FinalPage,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';
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
    onPreviewTarget: (file: SourceFile, target: SourceTarget) => void;
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
    onPreviewTarget,
    editsByFile,
    focusedTarget,
    focusFlashKey,
}: Props) {
    const { t } = useTranslation();
    const panelTransition = {
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    };
    const panelContent = !file ? (
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
    ) : file.kind === 'image' ? (
        <ImagePanel
            file={file}
            editsByFile={editsByFile}
            isFocused={focusedTarget?.kind === 'image'}
            focusFlashKey={focusFlashKey}
            onRotate={(direction) => onRotateTarget(file.id, { kind: 'image' }, direction)}
            isIncluded={finalPages.some((page) => page.fileId === file.id && page.kind === 'image')}
            onInclude={() => onSetImageIncluded(file.id, true)}
            onFocus={() => onFocusTarget(file.id, { kind: 'image' })}
            onPreview={() => onPreviewTarget(file, { kind: 'image' })}
        />
    ) : (
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
            onPreview={(pageNum) => onPreviewTarget(file, { kind: 'pdf', pageNum })}
        />
    );

    return (
        <AnimatePresence initial={false} mode="wait">
            <motion.div
                key={file ? `${file.kind}:${file.id}` : 'empty'}
                className="h-full min-h-0"
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }}
                transition={panelTransition}
            >
                {panelContent}
            </motion.div>
        </AnimatePresence>
    );
}
