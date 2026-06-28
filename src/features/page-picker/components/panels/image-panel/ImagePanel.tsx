import { useState } from 'react';
import { useImagePreview } from '@/infra/image-preview';
import type { FileEdits, RotationDirection, SourceFile } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { useTranslation } from '@/shared/i18n';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { useElementSize } from '../../hooks/element-size.hook';
import { ImageActionToolbar, ImageStage } from './ImageStage';
import { type ImageNaturalSize, imagePanelGeometry } from './image-panel-geometry';

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
    const [imageNaturalSize, setImageNaturalSize] = useState<ImageNaturalSize | null>(null);

    const { src: imageUrl } = useImagePreview(file);
    const quarterTurns = FileEditsVO.getImageQuarterTurn(editsByFile[file.id]);
    const rotation = FileEditsVO.getImageRotationDegrees(editsByFile[file.id]);
    const geometry = imagePanelGeometry(imageStageSize, imageNaturalSize, quarterTurns);

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
                        <ImageStage
                            fileName={file.name}
                            imageUrl={imageUrl}
                            rotation={rotation}
                            isFocused={isFocused}
                            focusFlashKey={focusFlashKey}
                            geometry={geometry}
                            onClick={handleImageClick}
                            onImageLoad={setImageNaturalSize}
                        />

                        <ImageActionToolbar
                            width={geometry.outerFrameSize.width}
                            onPreview={onPreview}
                            onRotate={onRotate}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
