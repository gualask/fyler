interface Props {
    flashKey: number;
    className: string;
}

export function FocusFlashOverlay({ flashKey, className }: Props) {
    return (
        <div
            key={flashKey}
            onAnimationEnd={(event) => {
                event.currentTarget.style.display = 'none';
            }}
            className={`flash-accent-thumb pointer-events-none absolute z-10 bg-ui-accent/60 ${className}`}
        />
    );
}
