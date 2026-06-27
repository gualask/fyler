import { IconRotate2, IconRotateClockwise2, IconZoomIn } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { getPreviewUrl } from '@/infra/platform';
import type { FileEdits, RotationDirection, SourceFile } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { useTranslation } from '@/shared/i18n';
import { FocusFlashOverlay } from '@/shared/ui/feedback/FocusFlashOverlay';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useElementSize } from '../hooks/element-size.hook';
import {
    addImageStageChrome,
    fitFixedImageFrame,
    fitImageThumb,
    IMAGE_FRAME_MAX_HEIGHT,
    IMAGE_FRAME_MAX_WIDTH,
    IMAGE_STAGE_CHROME,
} from './image-panel-layout';

const IMAGE_THUMB_FALLBACK_WIDTH = 420;
const IMAGE_THUMB_FALLBACK_HEIGHT = 320;
const IMAGE_ACTION_TOOLBAR_HEIGHT = 48;
const IMAGE_ACTION_TOOLBAR_GAP = 8;

const imageActionButtonClassName =
    'flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ui-overlay-text)] transition-[background-color,transform,color,opacity,box-shadow] hover:bg-[var(--ui-overlay-control-hover)] focus-visible:bg-[var(--ui-overlay-control-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ui-accent-muted)] active:scale-[0.97]';

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

function ImageActionToolbar({
    width,
    onPreview,
    onRotate,
}: {
    width: number;
    onPreview: () => void;
    onRotate: (direction: RotationDirection) => Promise<void>;
}) {
    const { t } = useTranslation();

    return (
        <div
            className="flex h-12 max-w-full shrink-0 items-center justify-center"
            style={{ width }}
        >
            <div className="flex h-11 items-center gap-0.5 rounded-xl border border-[color:var(--ui-overlay-border)] bg-[color:var(--ui-overlay-control-strong)] px-1 text-[var(--ui-overlay-text)] shadow-[0_12px_32px_var(--ui-overlay-shadow)]">
                <button
                    type="button"
                    onClick={() => void onRotate('ccw')}
                    className={imageActionButtonClassName}
                    title={t('quickActions.rotateLeft')}
                    aria-label={t('quickActions.rotateLeft')}
                >
                    <IconRotate2 className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={onPreview}
                    className={imageActionButtonClassName}
                    title={t('quickActions.preview')}
                    aria-label={t('quickActions.preview')}
                >
                    <IconZoomIn className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => void onRotate('cw')}
                    className={imageActionButtonClassName}
                    title={t('quickActions.rotateRight')}
                    aria-label={t('quickActions.rotateRight')}
                >
                    <IconRotateClockwise2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
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
    const maxFrameWidth =
        imageStageSize.width > 0
            ? Math.min(
                  Math.max(imageStageSize.width - IMAGE_STAGE_CHROME, 1),
                  IMAGE_FRAME_MAX_WIDTH,
              )
            : IMAGE_FRAME_MAX_WIDTH;
    const maxFrameHeight =
        imageStageSize.height > 0
            ? Math.min(
                  Math.max(
                      imageStageSize.height -
                          IMAGE_STAGE_CHROME -
                          IMAGE_ACTION_TOOLBAR_HEIGHT -
                          IMAGE_ACTION_TOOLBAR_GAP,
                      1,
                  ),
                  IMAGE_FRAME_MAX_HEIGHT,
              )
            : IMAGE_FRAME_MAX_HEIGHT;
    const naturalWidth = imageNaturalSize?.width ?? IMAGE_THUMB_FALLBACK_WIDTH;
    const naturalHeight = imageNaturalSize?.height ?? IMAGE_THUMB_FALLBACK_HEIGHT;
    const rotatedWidth = isQuarterTurnOdd ? naturalHeight : naturalWidth;
    const rotatedHeight = isQuarterTurnOdd ? naturalWidth : naturalHeight;
    const frameSize = fitFixedImageFrame(maxFrameWidth, maxFrameHeight);
    const thumbSize = fitImageThumb(rotatedWidth, rotatedHeight, frameSize.width, frameSize.height);
    const outerFrameSize = addImageStageChrome(frameSize);
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
                        className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2"
                    >
                        <div
                            className="group relative cursor-pointer rounded-2xl border-2 border-transparent p-2 transition-colors"
                            style={{
                                width: outerFrameSize.width,
                                height: outerFrameSize.height,
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
                            {isFocused && focusFlashKey ? (
                                <FocusFlashOverlay
                                    flashKey={focusFlashKey}
                                    className="inset-2 rounded-xl"
                                />
                            ) : null}
                        </div>

                        <ImageActionToolbar
                            width={outerFrameSize.width}
                            onPreview={onPreview}
                            onRotate={onRotate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
