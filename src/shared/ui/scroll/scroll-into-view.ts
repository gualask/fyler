export function scrollIntoViewByDataAttr({
    root,
    attr,
    value,
    behavior = 'smooth',
    block = 'nearest',
    inline = 'nearest',
    signal,
    maxFrames = 3,
}: {
    root: ParentNode | null;
    attr: string;
    value: string;
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    signal?: unknown;
    maxFrames?: number;
}): () => void {
    if (!root) return () => {};

    let rafId = 0;
    let attempts = 0;

    const selector = `[${attr}="${CSS.escape(value)}"]`;
    const tryScroll = () => {
        void signal;
        const el = root.querySelector(selector) as HTMLElement | null;
        if (el) {
            el.scrollIntoView({ behavior, block, inline });
            return;
        }

        attempts += 1;
        if (attempts < maxFrames) {
            rafId = requestAnimationFrame(tryScroll);
        }
    };

    rafId = requestAnimationFrame(tryScroll);

    return () => cancelAnimationFrame(rafId);
}
