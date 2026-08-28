import { IconRotate2, IconRotateClockwise2, IconX, IconZoomIn } from '@tabler/icons-react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from '@/shared/i18n';
import {
    overlayToolbarIconButtonClassName,
    overlayToolbarPanelGroupClassName,
} from './overlay-toolbar.styles';

interface Props {
    onPreview?: () => void;
    onRotateLeft?: () => void;
    onRotateRight?: () => void;
    onRemove?: () => void;
    rotateLeftTitle?: string;
    rotateRightTitle?: string;
    removeTitle?: string;
    disabled?: boolean;
    compact?: boolean;
    rotationPlacement?: 'bottom-center' | 'top-left';
    appearance?: 'buttons' | 'toolbar';
}

interface ActionButtonProps {
    sizeClass: string;
    iconSizeClass: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    disabled: boolean;
    toneClassName: string;
    appearance: 'buttons' | 'toolbar';
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
    appearance,
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
            className={
                appearance === 'toolbar'
                    ? overlayToolbarIconButtonClassName
                    : `flex ${sizeClass} items-center justify-center rounded-full ${overlayActionBaseClassName} ${toneClassName}`
            }
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
    onRemove,
    rotateLeftTitle,
    rotateRightTitle,
    removeTitle,
    disabled = false,
    compact = false,
    rotationPlacement = 'bottom-center',
    appearance = 'buttons',
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
            {appearance === 'buttons' ? (
                <div className="absolute inset-0 bg-[var(--ui-overlay-scrim)]" />
            ) : null}

            {onPreview ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className={
                            appearance === 'toolbar' ? overlayToolbarPanelGroupClassName : ''
                        }
                    >
                        <ActionButton
                            sizeClass={previewSize}
                            iconSizeClass={iconSize}
                            icon={IconZoomIn}
                            title={t('quickActions.preview')}
                            disabled={disabled}
                            toneClassName={previewButtonTone}
                            appearance={appearance}
                            onClick={onPreview}
                        />
                    </div>
                </div>
            ) : null}

            {onRemove ? (
                <div
                    className={`absolute right-2.5 top-2.5 ${
                        appearance === 'toolbar' ? overlayToolbarPanelGroupClassName : ''
                    }`}
                >
                    <ActionButton
                        sizeClass={rotateSize}
                        iconSizeClass={iconSize}
                        icon={IconX}
                        title={removeTitle ?? t('quickActions.remove')}
                        disabled={disabled}
                        toneClassName={rotateButtonTone}
                        appearance={appearance}
                        onClick={onRemove}
                    />
                </div>
            ) : null}

            {onRotateLeft || onRotateRight ? (
                <div
                    className={
                        rotationPlacement === 'top-left'
                            ? `absolute left-2.5 top-2.5 flex items-center ${
                                  appearance === 'toolbar'
                                      ? overlayToolbarPanelGroupClassName
                                      : 'gap-1'
                              }`
                            : 'absolute inset-x-0 bottom-2.5 flex items-center justify-center gap-1'
                    }
                >
                    {onRotateLeft ? (
                        <ActionButton
                            sizeClass={rotateSize}
                            iconSizeClass={iconSize}
                            icon={IconRotate2}
                            title={rotateLeftTitle ?? t('quickActions.rotateLeft')}
                            disabled={disabled}
                            toneClassName={rotateButtonTone}
                            appearance={appearance}
                            onClick={onRotateLeft}
                        />
                    ) : null}
                    {onRotateRight ? (
                        <ActionButton
                            sizeClass={rotateSize}
                            iconSizeClass={iconSize}
                            icon={IconRotateClockwise2}
                            title={rotateRightTitle ?? t('quickActions.rotateRight')}
                            disabled={disabled}
                            toneClassName={rotateButtonTone}
                            appearance={appearance}
                            onClick={onRotateRight}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
