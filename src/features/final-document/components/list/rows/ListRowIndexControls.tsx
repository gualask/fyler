import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import {
    type KeyboardEvent,
    type MouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useTranslation } from '@/shared/i18n';

interface Props {
    indexLabel: number;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    size?: 'sm' | 'lg';
    onMoveToIndex?: (targetIndex: number) => void;
    totalItems?: number;
}

type ControlSize = NonNullable<Props['size']>;

type ControlClasses = {
    button: string;
    icon: string;
    label: string;
    labelButton: string;
    input: string;
};

type IndexDisplayProps = {
    isEditing: boolean;
    indexLabel: number;
    totalItems?: number;
    canEdit: boolean;
    classes: ControlClasses;
    inputRef: RefObject<HTMLInputElement | null>;
    moveToIndexLabel: string;
    onCommit: () => void;
    onCancel: () => void;
    onStartEditing: (event: MouseEvent<HTMLButtonElement>) => void;
};

type CommitIndexEditOptions = {
    inputRef: RefObject<HTMLInputElement | null>;
    onMoveToIndex?: (targetIndex: number) => void;
    totalItems?: number;
    indexLabel: number;
    setIsEditing: (isEditing: boolean) => void;
};

const CONTROL_CLASSES: Record<ControlSize, ControlClasses> = {
    sm: {
        button: 'flex h-9 w-9 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text disabled:invisible',
        icon: 'h-4 w-4',
        label: 'text-xs font-bold text-ui-text-muted',
        labelButton:
            'flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-xs font-bold text-ui-text-muted transition-colors hover:bg-ui-accent/15 hover:text-ui-accent-text',
        input: 'h-9 w-10 rounded-md border border-ui-border bg-ui-bg text-center text-xs font-bold text-ui-text outline-none focus:border-ui-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    },
    lg: {
        button: 'flex h-10 w-10 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text disabled:invisible',
        icon: 'h-5 w-5',
        label: 'text-sm font-bold text-ui-text-muted',
        labelButton:
            'flex h-10 min-w-[2.75rem] items-center justify-center rounded-md px-2 text-sm font-bold text-ui-text-muted transition-colors hover:bg-ui-accent/15 hover:text-ui-accent-text',
        input: 'h-10 w-11 rounded-md border border-ui-border bg-ui-bg text-center text-sm font-bold text-ui-text outline-none focus:border-ui-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    },
};

function targetIndexFromInput(
    rawValue: string,
    totalItems: number | undefined,
    indexLabel: number,
): number | null {
    if (totalItems === undefined) return null;

    const value = Number.parseInt(rawValue, 10);
    if (Number.isNaN(value) || value < 1 || value > totalItems || value === indexLabel) {
        return null;
    }

    return value - 1;
}

function useEditingInputSelection(
    isEditing: boolean,
    inputRef: RefObject<HTMLInputElement | null>,
) {
    useEffect(() => {
        if (isEditing) {
            inputRef.current?.select();
        }
    }, [inputRef, isEditing]);
}

function useCommitIndexEdit({
    inputRef,
    onMoveToIndex,
    totalItems,
    indexLabel,
    setIsEditing,
}: CommitIndexEditOptions) {
    const isCommitting = useRef(false);

    return useCallback(() => {
        if (isCommitting.current) return;

        isCommitting.current = true;
        const targetIndex =
            inputRef.current && onMoveToIndex
                ? targetIndexFromInput(inputRef.current.value, totalItems, indexLabel)
                : null;

        if (targetIndex !== null) {
            onMoveToIndex?.(targetIndex);
        }

        setIsEditing(false);
        isCommitting.current = false;
    }, [indexLabel, inputRef, onMoveToIndex, setIsEditing, totalItems]);
}

function handleIndexInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    onCommit: () => void,
    onCancel: () => void,
) {
    if (event.key === 'Enter') onCommit();
    if (event.key === 'Escape') onCancel();
}

function IndexDisplay({
    isEditing,
    indexLabel,
    totalItems,
    canEdit,
    classes,
    inputRef,
    moveToIndexLabel,
    onCommit,
    onCancel,
    onStartEditing,
}: IndexDisplayProps) {
    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                min={1}
                max={totalItems}
                defaultValue={indexLabel}
                className={classes.input}
                aria-label={moveToIndexLabel}
                onBlur={onCommit}
                onKeyDown={(event) => handleIndexInputKeyDown(event, onCommit, onCancel)}
            />
        );
    }

    if (canEdit) {
        return (
            <button
                type="button"
                onClick={onStartEditing}
                className={classes.labelButton}
                title={moveToIndexLabel}
                aria-label={moveToIndexLabel}
            >
                {indexLabel}
            </button>
        );
    }

    return <span className={classes.label}>{indexLabel}</span>;
}

export function ListRowIndexControls({
    indexLabel,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
    size = 'sm',
    onMoveToIndex,
    totalItems,
}: Props) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const classes = CONTROL_CLASSES[size];
    const moveToIndexLabel = t('finalDocument.moveToIndex');
    const movePageUpLabel = t('finalDocument.movePageUp');
    const movePageDownLabel = t('finalDocument.movePageDown');
    const commitEdit = useCommitIndexEdit({
        inputRef,
        onMoveToIndex,
        totalItems,
        indexLabel,
        setIsEditing,
    });

    useEditingInputSelection(isEditing, inputRef);

    return (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst}
                className={classes.button}
                aria-label={movePageUpLabel}
                title={movePageUpLabel}
            >
                <IconChevronUp className={classes.icon} />
            </button>

            <IndexDisplay
                isEditing={isEditing}
                indexLabel={indexLabel}
                totalItems={totalItems}
                canEdit={Boolean(onMoveToIndex)}
                classes={classes}
                inputRef={inputRef}
                moveToIndexLabel={moveToIndexLabel}
                onCommit={commitEdit}
                onCancel={() => setIsEditing(false)}
                onStartEditing={(event) => {
                    event.stopPropagation();
                    setIsEditing(true);
                }}
            />

            <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast}
                className={classes.button}
                aria-label={movePageDownLabel}
                title={movePageDownLabel}
            >
                <IconChevronDown className={classes.icon} />
            </button>
        </div>
    );
}
