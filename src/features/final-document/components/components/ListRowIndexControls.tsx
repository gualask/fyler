import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

interface Props {
    indexLabel: number;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

export function ListRowIndexControls({ indexLabel, isFirst, isLast, onMoveUp, onMoveDown }: Props) {
    return (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst}
                className="cursor-pointer rounded p-0.5 text-ui-text-muted transition-colors hover:text-ui-text disabled:invisible"
            >
                <IconChevronUp className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-ui-text-muted">{indexLabel}</span>
            <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast}
                className="cursor-pointer rounded p-0.5 text-ui-text-muted transition-colors hover:text-ui-text disabled:invisible"
            >
                <IconChevronDown className="h-4 w-4" />
            </button>
        </div>
    );
}
