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
const IMAGE_STAGE_CHROME = 16;

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
    const [imageStageEl, imageStageSize] = useElementSize();
    const [imageNaturalSize, setImageNaturalSize] = useState<{
        width: number;
        height: number;
    } | null>(null);

    const imageUrl = getPreviewUrl(file.originalPath);
    const quarterTurns = FileEditsVO.getImageQuarterTurn(editsByFile[file.id]);
    const rotation = FileEditsVO.getImageRotationDegrees(editsByFile[file.id]);
    const isQuarterTurnOdd = quarterTurns % 2 === 1;
    const maxThumbWidth =
        imageStageSize.width > 0
            ? Math.min(Math.max(imageStageSize.width - IMAGE_STAGE_CHROME, 1), 560)
            : IMAGE_THUMB_FALLBACK_WIDTH;
    const maxThumbHeight =
        imageStageSize.height > 0
            ? Math.min(
                  Math.max(imageStageSize.height - IMAGE_STAGE_CHROME, 1),
                  IMAGE_THUMB_MAX_HEIGHT,
              )
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
            <div className="section-body flex min-h-0 flex-1 flex-col px-5 py-4">
                <div className="page-picker-image-stack mx-auto flex h-full w-full max-w-4xl min-h-0 flex-col items-center">
                    <div
                        ref={imageStageEl}
                        className="flex min-h-0 w-full flex-1 items-center justify-center"
                    >
                        <div
                            className={[
                                'group relative cursor-pointer rounded-2xl border-2 p-2 transition-colors',
                                isFocused ? 'border-[3px] border-ui-accent' : 'border-transparent',
                            ].join(' ')}
                            style={{
                                width: thumbSize.width + 16,
                                height: thumbSize.height + 16,
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }}
                            onClick={handleImageClick}
                        >
                            <div className="relative h-full w-full overflow-hidden rounded-xl bg-white shadow-sm">
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
                                    className="inset-2 rounded-xl"
                                />
                            )}
                            <PageQuickActions
                                onPreview={onPreview}
                                onRotateLeft={() => void onRotate('ccw')}
                                onRotateRight={() => void onRotate('cw')}
                            />
                        </div>
                    </div>

                    <span className="max-w-md shrink-0 text-center text-xs text-ui-text-muted">
                        {t('pagePicker.includedAutomatically')}
                    </span>
                </div>
            </div>
        </div>
    );
}
