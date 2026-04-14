import { motion } from 'motion/react';
import { useState } from 'react';
import { getPreviewUrl } from '@/infra/platform';
import type { FileEdits, RotationDirection, SourceFile } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { useTranslation } from '@/shared/i18n';
import { PageQuickActions } from '@/shared/ui/actions/PageQuickActions';
import { FocusFlashOverlay } from '@/shared/ui/feedback/FocusFlashOverlay';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useElementSize } from '../hooks/element-size.hook';

const IMAGE_THUMB_FALLBACK_WIDTH = 420;
const IMAGE_THUMB_FALLBACK_HEIGHT = 320;
const IMAGE_THUMB_MAX_HEIGHT = 420;

function fitImageThumb(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number,
): { width: number; height: number } {
    if (width <= 0 || height <= 0) {
        return { width: maxWidth, height: maxHeight };
    }

    const scale = Math.min(maxWidth / width, maxHeight / height);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

interface Props {
    file: SourceFile;
    editsByFile: Record<string, FileEdits>;
    isFocused: boolean;
    focusFlashKey?: number;
    onRotate: (direction: RotationDirection) => Promise<void>;
    isIncluded: boolean;
    onInclude: () => void;
    onFocus: () => void;
    onPreview: () => void;
}

export function ImagePanel({
    file,
    editsByFile,
    isFocused,
    focusFlashKey,
    onRotate,
    isIncluded,
    onInclude,
    onFocus,
    onPreview,
}: Props) {
    const { t } = useTranslation();
    const [imagePanelEl, imagePanelSize] = useElementSize();
    const [imageNaturalSize, setImageNaturalSize] = useState<{
        width: number;
        height: number;
    } | null>(null);

    const imageUrl = getPreviewUrl(file.originalPath);
    const quarterTurns = FileEditsVO.getImageQuarterTurn(editsByFile[file.id]);
    const rotation = FileEditsVO.getImageRotationDegrees(editsByFile[file.id]);
    const isQuarterTurnOdd = quarterTurns % 2 === 1;
    const maxThumbWidth =
        imagePanelSize.width > 0
            ? Math.max(240, Math.min(imagePanelSize.width - 24, 560))
            : IMAGE_THUMB_FALLBACK_WIDTH;
    const maxThumbHeight =
        imagePanelSize.height > 0
            ? Math.max(180, Math.min(imagePanelSize.height - 76, IMAGE_THUMB_MAX_HEIGHT))
            : IMAGE_THUMB_MAX_HEIGHT;
    const naturalWidth = imageNaturalSize?.width ?? IMAGE_THUMB_FALLBACK_WIDTH;
    const naturalHeight = imageNaturalSize?.height ?? IMAGE_THUMB_FALLBACK_HEIGHT;
    const rotatedWidth = isQuarterTurnOdd ? naturalHeight : naturalWidth;
    const rotatedHeight = isQuarterTurnOdd ? naturalWidth : naturalHeight;
    const thumbSize = fitImageThumb(rotatedWidth, rotatedHeight, maxThumbWidth, maxThumbHeight);
    const stageSize = isQuarterTurnOdd
        ? { width: thumbSize.height, height: thumbSize.width }
        : thumbSize;

    const handleImageClick = () => {
        if (!isIncluded) onInclude();
        onFocus();
    };

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <SectionHeader
                title={t('pagePicker.sectionTitle', { count: 1 })}
                className="border-b-0"
            >
                <span className="section-toolbar-note">{t('pagePicker.singleImage')}</span>
            </SectionHeader>
            <div
                ref={imagePanelEl}
                className="section-body flex flex-1 flex-col items-center justify-center gap-3 p-4"
            >
                <div
                    className={[
                        'group relative cursor-pointer rounded-xl border-2 p-1 transition-colors',
                        isFocused ? 'border-[3px] border-ui-accent' : 'border-transparent',
                    ].join(' ')}
                    style={{ width: thumbSize.width + 8, height: thumbSize.height + 8 }}
                    onClick={handleImageClick}
                >
                    <div className="relative h-full w-full overflow-hidden rounded-lg bg-white shadow-sm">
                        <motion.div
                            className="absolute left-1/2 top-1/2"
                            style={{
                                width: stageSize.width,
                                height: stageSize.height,
                                x: '-50%',
                                y: '-50%',
                                transformOrigin: 'center',
                            }}
                            animate={{ rotate: rotation }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            <img
                                src={imageUrl}
                                alt={file.name}
                                className="h-full w-full object-contain"
                                onLoad={(event) => {
                                    setImageNaturalSize({
                                        width: event.currentTarget.naturalWidth,
                                        height: event.currentTarget.naturalHeight,
                                    });
                                }}
                            />
                        </motion.div>
                    </div>
                    {isFocused && focusFlashKey && (
                        <FocusFlashOverlay
                            flashKey={focusFlashKey}
                            className="inset-1 rounded-lg"
                        />
                    )}
                    <PageQuickActions
                        onPreview={onPreview}
                        onRotateLeft={() => void onRotate('ccw')}
                        onRotateRight={() => void onRotate('cw')}
                    />
                </div>
                <span className="text-xs text-ui-text-muted">
                    {t('pagePicker.includedAutomatically')}
                </span>
            </div>
        </div>
    );
}
