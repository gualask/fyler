import { IconRotate2, IconRotateClockwise2 } from '@tabler/icons-react';
import type { RotationDirection } from '@/shared/domain';

interface Props {
    isRotating: boolean;
    onRotate: (direction: RotationDirection) => void;
    rotateLeftTitle: string;
    rotateRightTitle: string;
}

export function RotateControls({ isRotating, onRotate, rotateLeftTitle, rotateRightTitle }: Props) {
    return (
        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
            <button
                type="button"
                onClick={() => onRotate('ccw')}
                disabled={isRotating}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                title={rotateLeftTitle}
            >
                <IconRotate2 className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => onRotate('cw')}
                disabled={isRotating}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                title={rotateRightTitle}
            >
                <IconRotateClockwise2 className="h-4 w-4" />
            </button>
        </div>
    );
}
