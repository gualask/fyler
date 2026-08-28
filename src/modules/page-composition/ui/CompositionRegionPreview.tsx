import { IconFileUpload } from '@tabler/icons-react';
import { motion } from 'motion/react';
import type { CSSProperties, RefObject } from 'react';

import { useImagePreview } from '@/capabilities/document-preview/image-preview.hook';
import { useTranslation } from '@/shared/i18n';
import { PageQuickActions } from '@/shared/ui/actions/PageQuickActions';
import type {
    CompositionPreviewLayout,
    CompositionRegionKey,
    CompositionSource,
    PageComposition,
    QuarterTurn,
    Rect,
} from '../model';

function rectStyle(rect: Rect, page: Rect): CSSProperties {
    return {
        left: `${(rect.xPt / page.widthPt) * 100}%`,
        top: `${((page.heightPt - rect.yPt - rect.heightPt) / page.heightPt) * 100}%`,
        width: `${(rect.widthPt / page.widthPt) * 100}%`,
        height: `${(rect.heightPt / page.heightPt) * 100}%`,
    };
}

function nestedRectStyle(rect: Rect, parent: Rect): CSSProperties {
    return {
        left: `${((rect.xPt - parent.xPt) / parent.widthPt) * 100}%`,
        top: `${((parent.yPt + parent.heightPt - rect.yPt - rect.heightPt) / parent.heightPt) * 100}%`,
        width: `${(rect.widthPt / parent.widthPt) * 100}%`,
        height: `${(rect.heightPt / parent.heightPt) * 100}%`,
    };
}

function sourceFile(source: CompositionSource) {
    return source.kind === 'image' ? source.file : source.rasterFile;
}

function sourceSummary(source: CompositionSource) {
    return source.kind === 'image'
        ? source.file.name
        : `${source.file.name}, page ${source.pageNum}`;
}

function rotationStyle(rotation: QuarterTurn, drawRect: Rect): CSSProperties {
    const degrees = rotation * 90;
    if (rotation % 2 === 0) {
        return { width: '100%', height: '100%', transform: `rotate(${degrees}deg)` };
    }
    return {
        width: `${(drawRect.heightPt / drawRect.widthPt) * 100}%`,
        height: `${(drawRect.widthPt / drawRect.heightPt) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${degrees}deg)`,
        left: '50%',
        top: '50%',
        position: 'absolute',
    };
}

function RegionArtwork({
    source,
    rotation,
    drawRect,
}: {
    source: CompositionSource;
    rotation: QuarterTurn;
    drawRect: Rect;
}) {
    const preview = useImagePreview(sourceFile(source));
    if (!preview.src) {
        return <span className="absolute inset-0 animate-pulse bg-ui-surface-hover" />;
    }
    return (
        <img
            src={preview.src}
            alt=""
            draggable={false}
            className="object-contain transition-transform duration-200 motion-reduce:transition-none"
            style={rotationStyle(rotation, drawRect)}
        />
    );
}

function EmptyRegionPrompt({ label }: { label: string }) {
    const { t } = useTranslation();
    return (
        <>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ui-accent-soft text-ui-accent-on-soft">
                <IconFileUpload className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold text-ui-text-secondary">{label}</span>
            <span className="text-[10px] text-ui-text-muted">
                {t('pageComposition.region.addOrDropHint')}
            </span>
        </>
    );
}

function RegionSelectionButton({
    buttonRef,
    source,
    label,
    disabled,
    onChoose,
}: {
    buttonRef: RefObject<HTMLButtonElement | null>;
    source: CompositionSource | null;
    label: string;
    disabled: boolean;
    onChoose: () => void;
}) {
    const { t } = useTranslation();
    return (
        <button
            ref={buttonRef}
            type="button"
            onClick={onChoose}
            disabled={disabled}
            aria-label={
                source
                    ? t('pageComposition.region.replaceAccessible', {
                          region: label,
                          source: sourceSummary(source),
                      })
                    : t('pageComposition.region.addAccessible', { region: label })
            }
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-transparent text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-accent-muted"
        >
            {source ? (
                <span className="sr-only">{sourceSummary(source)}</span>
            ) : (
                <EmptyRegionPrompt label={label} />
            )}
        </button>
    );
}

function RegionActions({
    label,
    disabled,
    onRotate,
    onRemove,
}: {
    label: string;
    disabled: boolean;
    onRotate: (direction: 'ccw' | 'cw') => void;
    onRemove: () => void;
}) {
    const { t } = useTranslation();
    return (
        <PageQuickActions
            compact
            rotationPlacement="top-left"
            appearance="toolbar"
            disabled={disabled}
            onRotateLeft={() => onRotate('ccw')}
            onRotateRight={() => onRotate('cw')}
            onRemove={onRemove}
            rotateLeftTitle={t('pageComposition.rotateLeft', { region: label })}
            rotateRightTitle={t('pageComposition.rotateRight', { region: label })}
            removeTitle={t('pageComposition.remove', { region: label })}
        />
    );
}

function RegionDropFeedback({
    source,
    label,
}: {
    source: CompositionSource | null;
    label: string;
}) {
    const { t } = useTranslation();
    return (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-ui-accent-soft/70 text-center">
            <span className="rounded-lg bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-accent-text shadow-[0_12px_32px_var(--ui-overlay-shadow-muted)]">
                {t(
                    source
                        ? 'pageComposition.region.dropToReplace'
                        : 'pageComposition.region.dropToAdd',
                    { region: label },
                )}
            </span>
        </div>
    );
}

type CompositionRegionPreviewProps = {
    region: CompositionRegionKey;
    composition: PageComposition;
    layout: CompositionPreviewLayout;
    buttonRef: RefObject<HTMLButtonElement | null>;
    onChoose: () => void;
    onRotate: (direction: 'ccw' | 'cw') => void;
    onRemove: () => void;
    disabled: boolean;
    isDropTarget: boolean;
    animateLayout: boolean;
};

export function CompositionRegionPreview({
    region,
    composition,
    layout,
    buttonRef,
    onChoose,
    onRotate,
    onRemove,
    disabled,
    isDropTarget,
    animateLayout,
}: CompositionRegionPreviewProps) {
    const { t } = useTranslation();
    const value = composition.regions[region];
    const geometry = layout.regions[region];
    const label = t(region === 'top' ? 'pageComposition.front' : 'pageComposition.back');
    return (
        <motion.div
            layout={animateLayout}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            data-composition-region={region}
            className={`group absolute overflow-hidden rounded-[0.35rem] border border-dashed bg-ui-surface-subtle transition-[border-color,background-color] ${
                isDropTarget ? 'border-ui-accent bg-ui-accent-soft/35' : 'border-ui-border-hover'
            }`}
            style={rectStyle(geometry.regionRect, layout.pageRect)}
            onClick={disabled ? undefined : onChoose}
        >
            {value.source && geometry.drawRect ? (
                <div
                    className="absolute overflow-visible"
                    style={nestedRectStyle(geometry.drawRect, geometry.regionRect)}
                >
                    <RegionArtwork
                        source={value.source}
                        rotation={value.rotation}
                        drawRect={geometry.drawRect}
                    />
                </div>
            ) : null}
            <RegionSelectionButton
                buttonRef={buttonRef}
                source={value.source}
                label={label}
                disabled={disabled}
                onChoose={onChoose}
            />
            {value.source ? (
                <RegionActions
                    label={label}
                    disabled={disabled}
                    onRotate={onRotate}
                    onRemove={onRemove}
                />
            ) : null}
            {isDropTarget ? <RegionDropFeedback source={value.source} label={label} /> : null}
        </motion.div>
    );
}
