import { IconX } from '@tabler/icons-react';
import type { RotationDirection } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import type { MoveControl } from '../preview.types';
import { MoveToSelect } from './MoveToSelect';
import { RotateControls } from './RotateControls';
import {
    toolbarCounterClassName,
    toolbarFloatingRailClassName,
    toolbarIconButtonClassName,
    toolbarPanelGroupClassName,
} from './toolbar.styles';
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
        <div className={toolbarFloatingRailClassName}>
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

            <div className={`${toolbarCounterClassName} justify-self-center`}>
                {t('preview.counter', { current: displayCurrentPage, total: displayTotalPages })}
            </div>

            <div className="flex items-center gap-2 justify-self-end">
                {canRotate || (showMoveTo && moveControl) ? (
                    <div className={toolbarPanelGroupClassName}>
                        {canRotate ? (
                            <RotateControls
                                isRotating={isRotating}
                                onRotate={onRotate}
                                rotateLeftTitle={t('preview.rotateLeft')}
                                rotateRightTitle={t('preview.rotateRight')}
                            />
                        ) : null}

                        {showMoveTo && moveControl ? (
                            <MoveToSelect
                                moveControl={moveControl}
                                label={t('preview.moveTo')}
                                getPositionLabel={(position) =>
                                    t('preview.moveToPosition', { position })
                                }
                            />
                        ) : null}
                    </div>
                ) : null}

                <div className={toolbarPanelGroupClassName}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={toolbarIconButtonClassName}
                        title={t('preview.close')}
                        aria-label={t('preview.close')}
                    >
                        <IconX className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
