import { IconRotate2, IconRotateClockwise2, IconZoomIn } from '@tabler/icons-react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from '@/shared/i18n';

interface Props {
    onPreview?: () => void;
    onRotateLeft?: () => void;
    onRotateRight?: () => void;
    disabled?: boolean;
    compact?: boolean;
}

interface ActionButtonProps {
    sizeClass: string;
    iconSizeClass: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    disabled: boolean;
    toneClassName: string;
    onClick: () => void;
}

const overlayActionBaseClassName =
    'bg-[var(--ui-overlay-control-strong)] text-[var(--ui-overlay-text)]';

function ActionButton({
    sizeClass,
    iconSizeClass,
    icon: Icon,
    title,
    disabled,
    toneClassName,
    onClick,
}: ActionButtonProps) {
    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
            disabled={disabled}
            className={`flex ${sizeClass} items-center justify-center rounded-full ${overlayActionBaseClassName} ${toneClassName}`}
            title={title}
            aria-label={title}
        >
            <Icon className={iconSizeClass} />
        </button>
    );
}

export function PageQuickActions({
    onPreview,
    onRotateLeft,
    onRotateRight,
    disabled = false,
    compact = false,
}: Props) {
    const { t } = useTranslation();
    const previewSize = compact ? 'h-7 w-7' : 'h-8 w-8';
    const rotateSize = compact ? 'h-6 w-6' : 'h-7 w-7';
    const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const overlayActionToneBase =
        'transition-[background-color,transform,box-shadow] hover:scale-[1.05] hover:bg-[var(--ui-overlay-control-strong-hover)] focus-visible:bg-[var(--ui-overlay-control-strong-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-muted disabled:cursor-wait disabled:opacity-40 disabled:hover:scale-100';
    const previewButtonTone = `shadow-[0_12px_32px_var(--ui-overlay-shadow)] hover:shadow-[0_18px_40px_var(--ui-overlay-shadow)] ${overlayActionToneBase}`;
    const rotateButtonTone = `shadow-[0_12px_32px_var(--ui-overlay-shadow-muted)] hover:shadow-[0_16px_34px_var(--ui-overlay-shadow-muted)] ${overlayActionToneBase}`;

    return (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <div className="absolute inset-0 bg-[var(--ui-overlay-scrim)]" />

            {onPreview && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <ActionButton
                        sizeClass={previewSize}
                        iconSizeClass={iconSize}
                        icon={IconZoomIn}
                        title={t('quickActions.preview')}
                        disabled={disabled}
                        toneClassName={previewButtonTone}
                        onClick={onPreview}
                    />
                </div>
            )}

            {(onRotateLeft || onRotateRight) && (
                <div className="absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1">
                    {onRotateLeft && (
                        <ActionButton
                            sizeClass={rotateSize}
                            iconSizeClass={iconSize}
                            icon={IconRotate2}
                            title={t('quickActions.rotateLeft')}
                            disabled={disabled}
                            toneClassName={rotateButtonTone}
                            onClick={onRotateLeft}
                        />
                    )}
                    {onRotateRight && (
                        <ActionButton
                            sizeClass={rotateSize}
                            iconSizeClass={iconSize}
                            icon={IconRotateClockwise2}
                            title={t('quickActions.rotateRight')}
                            disabled={disabled}
                            toneClassName={rotateButtonTone}
                            onClick={onRotateRight}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
