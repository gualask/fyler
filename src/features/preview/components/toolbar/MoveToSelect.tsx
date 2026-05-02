import { IconChevronDown } from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import type { MoveControl } from '../preview.types';
import { toolbarSelectClassName, toolbarSelectWrapperClassName } from './toolbar.styles';

interface Props {
    moveControl: MoveControl;
    label: string;
    getPositionLabel: (position: number) => string;
}

export function MoveToSelect({ moveControl, label, getPositionLabel }: Props) {
    const [moveToValue, setMoveToValue] = useState('');
    const options = useMemo(
        () => Array.from({ length: moveControl.totalPositions }, (_, index) => index + 1),
        [moveControl.totalPositions],
    );

    const handleChange = useCallback(
        (target: string) => {
            setMoveToValue(target);
            const targetIndex = Number.parseInt(target, 10) - 1;
            if (
                Number.isNaN(targetIndex) ||
                targetIndex < 0 ||
                targetIndex >= moveControl.totalPositions
            ) {
                setMoveToValue('');
                return;
            }
            moveControl.onMoveToPosition(targetIndex);
            setMoveToValue('');
        },
        [moveControl],
    );

    return (
        <div className={toolbarSelectWrapperClassName}>
            <select
                value={moveToValue}
                onChange={(event) => handleChange(event.target.value)}
                className={toolbarSelectClassName}
                title={label}
                aria-label={label}
            >
                <option value="" className="text-slate-900">
                    {label}
                </option>
                {options.map((position) => (
                    <option
                        key={position}
                        value={position}
                        disabled={position === moveControl.currentPosition}
                        className="text-slate-900"
                    >
                        {getPositionLabel(position)}
                    </option>
                ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ui-overlay-text-muted)]" />
        </div>
    );
}
