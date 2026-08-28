type Props = {
    hasRemainingFiles: boolean;
    canSubmit: boolean;
    isChecking: boolean;
    skipFileLabel: string;
    skipAllLabel: string;
    unlockLabel: string;
    unlockingLabel: string;
    onSkipCurrent: () => void;
    onSkipAll: () => void;
    onSubmit: () => void;
};

export function DialogActions({
    hasRemainingFiles,
    canSubmit,
    isChecking,
    skipFileLabel,
    skipAllLabel,
    unlockLabel,
    unlockingLabel,
    onSkipCurrent,
    onSkipAll,
    onSubmit,
}: Props) {
    const submitLabel = isChecking ? unlockingLabel : unlockLabel;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border px-6 py-4">
            <div className="flex gap-2">
                <button
                    type="button"
                    className="btn-ghost"
                    disabled={isChecking}
                    onClick={onSkipCurrent}
                >
                    {skipFileLabel}
                </button>
                {hasRemainingFiles ? (
                    <button
                        type="button"
                        className="btn-ghost"
                        disabled={isChecking}
                        onClick={onSkipAll}
                    >
                        {skipAllLabel}
                    </button>
                ) : null}
            </div>
            <button
                type="button"
                className="btn-primary"
                disabled={!canSubmit || isChecking}
                onClick={onSubmit}
            >
                {submitLabel}
            </button>
        </div>
    );
}
