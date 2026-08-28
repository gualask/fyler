import { IconArrowsExchange2 } from '@tabler/icons-react';
import { motion, useReducedMotion } from 'motion/react';
import type { RefObject } from 'react';
import { useTranslation } from '@/shared/i18n';
import {
    overlayToolbarIconButtonClassName,
    overlayToolbarPanelGroupClassName,
} from '@/shared/ui/actions/overlay-toolbar.styles';
import type { CompositionPreviewLayout, CompositionRegionKey, PageComposition } from '../model';
import { CompositionRegionPreview } from './CompositionRegionPreview';

function SwapControl({ horizontal, onSwap }: { horizontal: boolean; onSwap: () => void }) {
    const { t } = useTranslation();
    return (
        <div
            className={`${overlayToolbarPanelGroupClassName} absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2`}
        >
            <button
                type="button"
                className={overlayToolbarIconButtonClassName}
                onClick={onSwap}
                aria-label={t('pageComposition.swap')}
                title={t('pageComposition.swap')}
            >
                <IconArrowsExchange2
                    className={`h-4 w-4 transition-transform motion-reduce:transition-none ${horizontal ? '' : 'rotate-90'}`}
                />
            </button>
        </div>
    );
}

type PreviewRegionsProps = {
    composition: PageComposition;
    layout: CompositionPreviewLayout;
    regionRefs: Record<CompositionRegionKey, RefObject<HTMLButtonElement | null>>;
    onChoose: (region: CompositionRegionKey) => void;
    onRotate: (region: CompositionRegionKey, direction: 'ccw' | 'cw') => void;
    onRemove: (region: CompositionRegionKey) => void;
    onSwap: () => void;
    disabled: boolean;
    dragRegion: CompositionRegionKey | null;
    animateLayout: boolean;
    horizontal: boolean;
};

function PreviewRegions(props: PreviewRegionsProps) {
    const { composition, layout, regionRefs, disabled, dragRegion, animateLayout } = props;
    const hasSwappableSource = Boolean(
        composition.regions.top.source || composition.regions.bottom.source,
    );
    return (
        <>
            {(['top', 'bottom'] as const).map((region) => (
                <CompositionRegionPreview
                    key={region}
                    region={region}
                    composition={composition}
                    layout={layout}
                    buttonRef={regionRefs[region]}
                    onChoose={() => props.onChoose(region)}
                    onRotate={(direction) => props.onRotate(region, direction)}
                    onRemove={() => props.onRemove(region)}
                    disabled={disabled}
                    isDropTarget={dragRegion === region}
                    animateLayout={animateLayout}
                />
            ))}
            {hasSwappableSource ? (
                <SwapControl horizontal={props.horizontal} onSwap={props.onSwap} />
            ) : null}
        </>
    );
}

export function CompositionPreview({
    composition,
    layout,
    regionRefs,
    onChoose,
    onRotate,
    onRemove,
    onSwap,
    disabled,
    dragRegion,
}: {
    composition: PageComposition;
    layout: CompositionPreviewLayout | null;
    regionRefs: Record<CompositionRegionKey, RefObject<HTMLButtonElement | null>>;
    onChoose: (region: CompositionRegionKey) => void;
    onRotate: (region: CompositionRegionKey, direction: 'ccw' | 'cw') => void;
    onRemove: (region: CompositionRegionKey) => void;
    onSwap: () => void;
    disabled: boolean;
    dragRegion: CompositionRegionKey | null;
}) {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const displayedLayout = layout?.layout ?? composition.layout;
    const isHorizontal = displayedLayout === 'a4-side-by-side-halves';
    return (
        <div
            className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-ui-output p-5 sm:p-8"
            style={{ containerType: 'size' }}
        >
            <motion.div
                layout={!reduceMotion}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                role="img"
                className="relative max-h-full max-w-full flex-none bg-[color:var(--ui-surface)] shadow-[0_18px_44px_-20px_var(--ui-shadow-panel)]"
                style={{
                    aspectRatio: isHorizontal ? '297 / 210' : '210 / 297',
                    width: isHorizontal ? 'min(100cqw, 141.42857cqh)' : 'min(100cqw, 70.70707cqh)',
                }}
                aria-label={t(
                    isHorizontal
                        ? 'pageComposition.previewLabelHorizontal'
                        : 'pageComposition.previewLabelVertical',
                )}
            >
                {layout ? (
                    <PreviewRegions
                        composition={composition}
                        layout={layout}
                        regionRefs={regionRefs}
                        onChoose={onChoose}
                        onRotate={onRotate}
                        onRemove={onRemove}
                        onSwap={onSwap}
                        disabled={disabled}
                        dragRegion={dragRegion}
                        animateLayout={!reduceMotion}
                        horizontal={isHorizontal}
                    />
                ) : (
                    <div
                        className="absolute inset-0 animate-pulse bg-ui-surface-hover"
                        role="status"
                        aria-label={t('pageComposition.previewLoading')}
                    />
                )}
            </motion.div>
        </div>
    );
}
