interface Props {
    text: string;
    stepLabel: string;
    skipLabel: string;
    nextLabel: string;
    className: string;
    style?: React.CSSProperties;
    onNext: () => void;
    onSkip: () => void;
}
export function TutorialCard({
    text,
    stepLabel,
    skipLabel,
    nextLabel,
    className,
    style,
    onNext,
    onSkip,
}: Props) {
    return (
        <div className={className} style={style}>
            <p className="text-sm text-ui-text">{text}</p>

            <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-ui-text-muted">{stepLabel}</span>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="text-xs font-medium text-ui-text-muted transition-colors hover:text-ui-text"
                    >
                        {skipLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        className="btn-primary px-4 py-1.5 text-xs"
                    >
                        {nextLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
