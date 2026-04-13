import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    const isCommitting = useRef(false);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.select();
        }
    }, [isEditing]);

    const commitEdit = useCallback(() => {
        if (isCommitting.current) return;
        isCommitting.current = true;
        if (!inputRef.current || !onMoveToIndex || totalItems === undefined) {
            setIsEditing(false);
            isCommitting.current = false;
            return;
        }
        const value = Number.parseInt(inputRef.current.value, 10);
        if (!Number.isNaN(value) && value >= 1 && value <= totalItems && value !== indexLabel) {
            onMoveToIndex(value - 1);
        }
        setIsEditing(false);
        isCommitting.current = false;
    }, [indexLabel, onMoveToIndex, totalItems]);

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

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="number"
                    min={1}
                    max={totalItems}
                    defaultValue={indexLabel}
                    className={`${labelClassName} w-8 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') setIsEditing(false);
                    }}
                />
            ) : onMoveToIndex ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                    }}
                    className={`${labelClassName} cursor-pointer rounded px-0.5 hover:bg-ui-accent/15 hover:text-ui-accent`}
                    title={t('finalDocument.moveToIndex')}
                >
                    {indexLabel}
                </button>
            ) : (
                <span className={labelClassName}>{indexLabel}</span>
            )}

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
