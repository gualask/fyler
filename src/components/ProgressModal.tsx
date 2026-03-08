interface Props {
    message: string;
    progress?: number; // 0-100, undefined = indeterminato
}

export function ProgressModal({ message, progress }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex w-72 flex-col items-center gap-4 rounded-xl bg-ui-surface p-6 shadow-2xl">
                {progress === undefined ? (
                    <svg
                        className="h-10 w-10 animate-spin text-ui-accent"
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                ) : (
                    <div className="w-full">
                        <div className="mb-2 flex justify-between text-xs text-ui-text-muted">
                            <span>{message}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ui-border">
                            <div
                                className="h-full rounded-full bg-ui-accent transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
                {progress === undefined && (
                    <p className="text-sm text-ui-text-muted">{message}</p>
                )}
            </div>
        </div>
    );
}
