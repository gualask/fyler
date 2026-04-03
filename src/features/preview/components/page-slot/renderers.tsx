const A4_ASPECT_RATIO = '595/842';

function renderImage(
    src: string,
    {
        className,
        style,
    }: {
        className: string;
        style?: React.CSSProperties;
    },
) {
    return <img src={src} alt="" draggable={false} className={className} style={style} />;
}

export function renderSpinnerSlot(aspectRatio: string) {
    return (
        <div className="flex w-full items-center justify-center bg-white" style={{ aspectRatio }}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
        </div>
    );
}

export function renderPdfSlot(src: string) {
    return renderImage(src, { className: 'block h-auto w-full select-none bg-white' });
}

export function renderPlainImage(src: string, rotation: number) {
    return renderImage(src, {
        className: 'block h-auto w-full select-none bg-white',
        style: { transform: `rotate(${rotation}deg)` },
    });
}

export function renderA4ContainedImage(
    src: string,
    rotation: number,
    fitMode: 'cover' | 'contain',
) {
    return (
        <div
            className="relative w-full overflow-hidden bg-white"
            style={{ aspectRatio: A4_ASPECT_RATIO }}
        >
            {renderImage(src, {
                className: [
                    'absolute inset-0 h-full w-full select-none',
                    fitMode === 'cover' ? 'object-cover' : 'object-contain',
                ].join(' '),
                style: { transform: `rotate(${rotation}deg)` },
            })}
        </div>
    );
}
