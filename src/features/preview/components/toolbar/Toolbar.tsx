import type { RotationDirection } from '@/shared/domain/file-edits';
import { useTranslation } from '@/shared/i18n';
import type { MoveControl } from '../types';
import { CloseButton } from './CloseButton';
import { MoveToSelect } from './MoveToSelect';
import { RotateControls } from './RotateControls';
import { ZoomControls } from './ZoomControls';

interface Props {
    displayCurrentPage: number;
    displayTotalPages: number;
    zoomLevel: number;
    canRotate: boolean;
    isRotating: boolean;
    moveControl?: MoveControl;
    onZoomOut: () => void;
    onZoomIn: () => void;
    onZoomReset: () => void;
    onRotate: (direction: RotationDirection) => void;
    onClose: () => void;
}

export function Toolbar({
    displayCurrentPage,
    displayTotalPages,
    zoomLevel,
    canRotate,
    isRotating,
    moveControl,
    onZoomOut,
    onZoomIn,
    onZoomReset,
    onRotate,
    onClose,
}: Props) {
    const { t } = useTranslation();
    const showMoveTo = Boolean(moveControl && moveControl.totalPositions > 1);

    return (
        <div className="absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-black/60 px-4 py-2">
            <div className="justify-self-start">
                <ZoomControls
                    zoomLevel={zoomLevel}
                    onZoomOut={onZoomOut}
                    onZoomIn={onZoomIn}
                    onZoomReset={onZoomReset}
                    zoomOutTitle={t('preview.zoomOut')}
                    zoomInTitle={t('preview.zoomIn')}
                    resetTitle={t('preview.resetZoom')}
                    resetLabel={t('preview.resetLabel')}
                />
            </div>

            <div className="justify-self-center text-sm font-medium text-white/85">
                {t('preview.counter', { current: displayCurrentPage, total: displayTotalPages })}
            </div>

            <div className="flex items-center gap-2 justify-self-end">
                {canRotate && (
                    <RotateControls
                        isRotating={isRotating}
                        onRotate={onRotate}
                        rotateLeftTitle={t('preview.rotateLeft')}
                        rotateRightTitle={t('preview.rotateRight')}
                    />
                )}

                {showMoveTo && moveControl ? (
                    <MoveToSelect
                        moveControl={moveControl}
                        label={t('preview.moveTo')}
                        getPositionLabel={(position) => t('preview.moveToPosition', { position })}
                    />
                ) : null}

                <CloseButton onClose={onClose} title={t('preview.close')} />
            </div>
        </div>
    );
}
