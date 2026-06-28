import { IconRotate2, IconRotateClockwise2, IconZoomIn } from '@tabler/icons-react';
import { motion } from 'motion/react';

import type { RotationDirection } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { FocusFlashOverlay } from '@/shared/ui/feedback/FocusFlashOverlay';

import type { ImageNaturalSize, ImagePanelGeometry } from './image-panel-geometry';

const imageActionButtonClassName =
    'flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ui-overlay-text)] transition-[background-color,transform,color,opacity,box-shadow] hover:bg-[var(--ui-overlay-control-hover)] focus-visible:bg-[var(--ui-overlay-control-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ui-accent-muted)] active:scale-[0.97]';

type ImageStageProps = {
    fileName: string;
    imageUrl: string | null | undefined;
    rotation: number;
    isFocused: boolean;
    focusFlashKey?: number;
    geometry: ImagePanelGeometry;
    onClick: () => void;
    onImageLoad: (size: ImageNaturalSize) => void;
};

export function ImageActionToolbar({
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

export function ImageStage({
    fileName,
    imageUrl,
    rotation,
    isFocused,
    focusFlashKey,
    geometry,
    onClick,
    onImageLoad,
}: ImageStageProps) {
    return (
        <div
            className="group relative cursor-pointer rounded-2xl border-2 border-transparent p-2 transition-colors"
            style={{
                width: geometry.outerFrameSize.width,
                height: geometry.outerFrameSize.height,
                maxWidth: '100%',
                maxHeight: '100%',
            }}
            onClick={onClick}
        >
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-white shadow-sm">
                <motion.div
                    className="absolute left-1/2 top-1/2"
                    style={{
                        width: geometry.stageSize.width,
                        height: geometry.stageSize.height,
                        x: '-50%',
                        y: '-50%',
                        transformOrigin: 'center',
                    }}
                    animate={{ rotate: rotation }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={fileName}
                            className="h-full w-full object-contain"
                            onLoad={(event) => {
                                onImageLoad({
                                    width: event.currentTarget.naturalWidth,
                                    height: event.currentTarget.naturalHeight,
                                });
                            }}
                        />
                    ) : null}
                </motion.div>
            </div>
            {isFocused && focusFlashKey ? (
                <FocusFlashOverlay flashKey={focusFlashKey} className="inset-2 rounded-xl" />
            ) : null}
        </div>
    );
}
