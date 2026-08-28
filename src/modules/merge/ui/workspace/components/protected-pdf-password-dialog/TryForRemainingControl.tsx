type Props = {
    visible: boolean;
    checked: boolean;
    disabled: boolean;
    label: string;
    onChange: (value: boolean) => void;
};

export function TryForRemainingControl({ visible, checked, disabled, label, onChange }: Props) {
    if (!visible) return null;

    return (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ui-border bg-ui-bg/60 p-3 text-sm text-ui-text-secondary">
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 rounded border-ui-border accent-ui-accent"
                onChange={(event) => onChange(event.target.checked)}
            />
            <span>{label}</span>
        </label>
    );
}
