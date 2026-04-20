import { IconRotate2, IconRotateClockwise2, IconZoomIn } from '@tabler/icons-react';
import type { ComponentType, CSSProperties, SVGProps } from 'react';
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
    toneStyle: CSSProperties;
    onClick: () => void;
}

function ActionButton({
    sizeClass,
    iconSizeClass,
    icon: Icon,
    title,
    disabled,
    toneClassName,
    toneStyle,
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
            className={`flex ${sizeClass} items-center justify-center rounded-full ${toneClassName}`}
            style={toneStyle}
            title={title}
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
    const previewButtonTone =
        'shadow-lg transition-colors hover:bg-[var(--ui-overlay-control-strong-hover)] disabled:cursor-wait disabled:opacity-40';
    const rotateButtonTone =
        'shadow-md transition-colors hover:bg-[var(--ui-overlay-control-strong-hover)] disabled:cursor-wait disabled:opacity-40';

    return (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
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
                        toneStyle={{
                            backgroundColor: 'var(--ui-overlay-control-strong)',
                            color: 'var(--ui-overlay-text)',
                        }}
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
                            toneStyle={{
                                backgroundColor: 'var(--ui-overlay-control-strong)',
                                color: 'var(--ui-overlay-text)',
                            }}
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
                            toneStyle={{
                                backgroundColor: 'var(--ui-overlay-control-strong)',
                                color: 'var(--ui-overlay-text)',
                            }}
                            onClick={onRotateRight}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
