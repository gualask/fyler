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
            ? 'flex h-10 w-10 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text disabled:invisible'
            : 'flex h-9 w-9 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text disabled:invisible';
    const iconClassName = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    const labelClassName =
        size === 'lg'
            ? 'text-sm font-bold text-ui-text-muted'
            : 'text-xs font-bold text-ui-text-muted';
    const labelButtonClassName =
        size === 'lg'
            ? 'flex h-10 min-w-[2.75rem] items-center justify-center rounded-md px-2 text-sm font-bold text-ui-text-muted transition-colors hover:bg-ui-accent/15 hover:text-ui-accent-text'
            : 'flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-xs font-bold text-ui-text-muted transition-colors hover:bg-ui-accent/15 hover:text-ui-accent-text';
    const inputClassName =
        size === 'lg'
            ? 'h-10 w-11 rounded-md border border-ui-border bg-ui-bg text-center text-sm font-bold text-ui-text outline-none focus:border-ui-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
            : 'h-9 w-10 rounded-md border border-ui-border bg-ui-bg text-center text-xs font-bold text-ui-text outline-none focus:border-ui-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

    return (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst}
                className={buttonClassName}
                aria-label={t('finalDocument.movePageUp')}
                title={t('finalDocument.movePageUp')}
            >
                <IconChevronUp className={iconClassName} />
            </button>

            {isEditing ? (
                <input
                    ref={inputRef}
                    type="number"
                    min={1}
                    max={totalItems}
                    defaultValue={indexLabel}
                    className={inputClassName}
                    aria-label={t('finalDocument.moveToIndex')}
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
                    className={labelButtonClassName}
                    title={t('finalDocument.moveToIndex')}
                    aria-label={t('finalDocument.moveToIndex')}
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
                aria-label={t('finalDocument.movePageDown')}
                title={t('finalDocument.movePageDown')}
            >
                <IconChevronDown className={iconClassName} />
            </button>
        </div>
    );
}
