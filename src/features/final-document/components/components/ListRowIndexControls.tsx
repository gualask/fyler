import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

interface Props {
    indexLabel: number;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    size?: 'sm' | 'lg';
}

export function ListRowIndexControls({
    indexLabel,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
    size = 'sm',
}: Props) {
    const buttonClassName =
        size === 'lg'
            ? 'flex h-8 w-8 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:text-ui-text disabled:invisible'
            : 'cursor-pointer rounded p-0.5 text-ui-text-muted transition-colors hover:text-ui-text disabled:invisible';
    const iconClassName = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    const labelClassName =
        size === 'lg'
            ? 'text-sm font-bold text-ui-text-muted'
            : 'text-xs font-bold text-ui-text-muted';

    return (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button type="button" onClick={onMoveUp} disabled={isFirst} className={buttonClassName}>
                <IconChevronUp className={iconClassName} />
            </button>
            <span className={labelClassName}>{indexLabel}</span>
            <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast}
                className={buttonClassName}
            >
                <IconChevronDown className={iconClassName} />
            </button>
        </div>
    );
}
