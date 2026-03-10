import { useState } from 'react';

import type { FileEdits, SourceFile } from '../../../domain';
import type { RotationDirection } from '../../../fileEdits';
import { getImageQuarterTurn, getImageRotationDegrees } from '../../../fileEdits';
import { useElementWidth } from '../../../hooks/useElementWidth';
import { getPreviewUrl } from '../../../platform';
import { ColumnHeader } from '../../shared/layout/ColumnHeader';
import { FocusFlashOverlay } from '../../shared/feedback/FocusFlashOverlay';
import { PageQuickActions } from '../../shared/actions/PageQuickActions';

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
    focusedPageNum: number | null;
    focusFlashKey?: number;
    onRotatePage: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    onPreview: () => void;
}

export function ImagePanel({
    file,
    editsByFile,
    focusedPageNum,
    focusFlashKey,
    onRotatePage,
    onPreview,
}: Props) {
    const [imagePanelEl, imagePanelWidth] = useElementWidth();
    const [imageNaturalSize, setImageNaturalSize] = useState<{
        width: number;
        height: number;
    } | null>(null);

    const imageUrl = getPreviewUrl(file.originalPath);
    const quarterTurns = getImageQuarterTurn(editsByFile[file.id]);
    const rotation = getImageRotationDegrees(editsByFile[file.id]);
    const isQuarterTurnOdd = quarterTurns % 2 === 1;
    const maxThumbWidth = imagePanelWidth > 0
        ? Math.max(240, Math.min(imagePanelWidth - 24, 560))
        : IMAGE_THUMB_FALLBACK_WIDTH;
    const naturalWidth = imageNaturalSize?.width ?? IMAGE_THUMB_FALLBACK_WIDTH;
    const naturalHeight = imageNaturalSize?.height ?? IMAGE_THUMB_FALLBACK_HEIGHT;
    const rotatedWidth = isQuarterTurnOdd ? naturalHeight : naturalWidth;
    const rotatedHeight = isQuarterTurnOdd ? naturalWidth : naturalHeight;
    const thumbSize = fitImageThumb(
        rotatedWidth,
        rotatedHeight,
        maxThumbWidth,
        IMAGE_THUMB_MAX_HEIGHT,
    );
    const stageSize = isQuarterTurnOdd
        ? { width: thumbSize.height, height: thumbSize.width }
        : thumbSize;

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <ColumnHeader title="Pagine">
                <span className="column-toolbar-note">Immagine singola</span>
            </ColumnHeader>
            <div ref={imagePanelEl} className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
                <div
                    className={[
                        'group relative cursor-pointer rounded-xl border-2 p-1 transition-colors',
                        focusedPageNum === 0 ? 'border-[3px] border-ui-accent' : 'border-transparent',
                    ].join(' ')}
                    style={{ width: thumbSize.width + 8, height: thumbSize.height + 8 }}
                    onClick={onPreview}
                >
                    <div className="relative h-full w-full overflow-hidden rounded-lg bg-white shadow-sm">
                        <div
                            className="absolute left-1/2 top-1/2"
                            style={{
                                width: stageSize.width,
                                height: stageSize.height,
                                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                transformOrigin: 'center',
                            }}
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
                        </div>
                    </div>
                    {focusedPageNum === 0 && focusFlashKey && (
                        <FocusFlashOverlay flashKey={focusFlashKey} className="inset-1 rounded-lg" />
                    )}
                    <PageQuickActions
                        onPreview={onPreview}
                        onRotateLeft={() => void onRotatePage(file.id, 0, 'ccw')}
                        onRotateRight={() => void onRotatePage(file.id, 0, 'cw')}
                    />
                </div>
                <span className="text-xs text-ui-text-muted">Inclusa automaticamente</span>
            </div>
        </div>
    );
}
