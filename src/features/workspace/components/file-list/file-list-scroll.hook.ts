import { useCallback, useEffect, useState } from 'react';
import { scrollIntoViewByDataAttr } from '@/shared/ui/scroll/scroll-into-view';

const FILE_CARD_SCROLL_STEP = 240 + 8; // w-60 + gap-2
const NO_HORIZONTAL_SCROLL: HorizontalScrollAvailability = {
    canScrollLeft: false,
    canScrollRight: false,
};

type HorizontalScrollAvailability = {
    canScrollLeft: boolean;
    canScrollRight: boolean;
};

export function useFileListScroll(selectedId: string | null, selectedScrollKey?: number) {
    const [scrollerEl, setScrollerEl] = useState<HTMLDivElement | null>(null);
    const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
    const scrollAvailability = useHorizontalScrollAvailability(scrollerEl, wrapEl);

    useEffect(() => {
        if (!selectedId || !scrollerEl) return;
        return scrollIntoViewByDataAttr({
            root: scrollerEl,
            attr: 'data-source-file-id',
            value: selectedId,
            inline: 'nearest',
            signal: selectedScrollKey,
        });
    }, [scrollerEl, selectedId, selectedScrollKey]);

    const scrollByCard = useCallback(
        (direction: -1 | 1) => {
            if (!scrollerEl) return;
            scrollerEl.scrollBy({ left: direction * FILE_CARD_SCROLL_STEP, behavior: 'smooth' });
        },
        [scrollerEl],
    );

    return {
        setScrollerEl,
        setWrapEl,
        ...scrollAvailability,
        scrollByCard,
    };
}

export type FileListScrollState = ReturnType<typeof useFileListScroll>;

function useHorizontalScrollAvailability(
    scrollerEl: HTMLDivElement | null,
    wrapEl: HTMLDivElement | null,
): HorizontalScrollAvailability {
    const [availability, setAvailability] =
        useState<HorizontalScrollAvailability>(NO_HORIZONTAL_SCROLL);

    useEffect(() => {
        if (!scrollerEl) {
            setAvailability(NO_HORIZONTAL_SCROLL);
            return;
        }

        const syncAvailability = () => {
            const next = getHorizontalScrollAvailability(scrollerEl);
            setAvailability((current) =>
                hasSameScrollAvailability(current, next) ? current : next,
            );
        };

        syncAvailability();
        scrollerEl.addEventListener('scroll', syncAvailability, { passive: true });

        const resizeObserver = new ResizeObserver(syncAvailability);
        resizeObserver.observe(scrollerEl);
        if (wrapEl) resizeObserver.observe(wrapEl);

        return () => {
            scrollerEl.removeEventListener('scroll', syncAvailability);
            resizeObserver.disconnect();
        };
    }, [scrollerEl, wrapEl]);

    return availability;
}

function getHorizontalScrollAvailability(scrollerEl: HTMLDivElement): HorizontalScrollAvailability {
    const maxScrollLeft = scrollerEl.scrollWidth - scrollerEl.clientWidth;
    if (maxScrollLeft <= 1) return NO_HORIZONTAL_SCROLL;

    return {
        canScrollLeft: scrollerEl.scrollLeft > 0,
        canScrollRight: scrollerEl.scrollLeft < maxScrollLeft - 1,
    };
}

function hasSameScrollAvailability(
    current: HorizontalScrollAvailability,
    next: HorizontalScrollAvailability,
) {
    return (
        current.canScrollLeft === next.canScrollLeft &&
        current.canScrollRight === next.canScrollRight
    );
}
