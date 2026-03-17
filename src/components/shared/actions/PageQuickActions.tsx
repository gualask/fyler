import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from '../../../i18n';

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
            className={`flex ${sizeClass} items-center justify-center rounded-full ${toneClassName}`}
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
    const previewButtonTone = 'bg-slate-800/80 text-white shadow-lg transition-colors hover:bg-slate-900 disabled:cursor-wait disabled:opacity-40';
    const rotateButtonTone = 'bg-white/85 text-slate-800 shadow-md transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-40';

    return (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />

            {onPreview && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <ActionButton
                        sizeClass={previewSize}
                        iconSizeClass={iconSize}
                        icon={MagnifyingGlassPlusIcon}
                        title={t('quickActions.preview')}
                        disabled={disabled}
                        toneClassName={previewButtonTone}
                        onClick={onPreview}
                    />
                </div>
            )}

            {(onRotateLeft || onRotateRight) && (
                <div className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1">
                    {onRotateLeft && (
                        <ActionButton
                            sizeClass={rotateSize}
                            iconSizeClass={iconSize}
                            icon={ArrowUturnLeftIcon}
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
                            icon={ArrowUturnRightIcon}
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
