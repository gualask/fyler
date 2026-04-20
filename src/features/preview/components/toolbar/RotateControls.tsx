import { IconRotate2, IconRotateClockwise2 } from '@tabler/icons-react';
import type { RotationDirection } from '@/shared/domain';
import { toolbarIconButtonClassName, toolbarPanelClassName } from './toolbar.styles';

interface Props {
    isRotating: boolean;
    onRotate: (direction: RotationDirection) => void;
    rotateLeftTitle: string;
    rotateRightTitle: string;
}

export function RotateControls({ isRotating, onRotate, rotateLeftTitle, rotateRightTitle }: Props) {
    return (
        <div className={`${toolbarPanelClassName} gap-0.5 px-1`}>
            <button
                type="button"
                onClick={() => onRotate('ccw')}
                disabled={isRotating}
                className={toolbarIconButtonClassName}
                title={rotateLeftTitle}
                aria-label={rotateLeftTitle}
            >
                <IconRotate2 className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => onRotate('cw')}
                disabled={isRotating}
                className={toolbarIconButtonClassName}
                title={rotateRightTitle}
                aria-label={rotateRightTitle}
            >
                <IconRotateClockwise2 className="h-4 w-4" />
            </button>
        </div>
    );
}
