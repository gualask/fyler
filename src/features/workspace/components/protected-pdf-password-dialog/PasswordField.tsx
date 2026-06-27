import type { KeyboardEvent } from 'react';

type Props = {
    passwordId: string;
    errorId: string;
    label: string;
    placeholder: string;
    password: string;
    disabled: boolean;
    errorMessage: string | null;
    onPasswordChange: (password: string) => void;
    onSubmit: () => void;
};

export function PasswordField({
    passwordId,
    errorId,
    label,
    placeholder,
    password,
    disabled,
    errorMessage,
    onPasswordChange,
    onSubmit,
}: Props) {
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        onSubmit();
    };

    return (
        <div className="space-y-2">
            <label htmlFor={passwordId} className="text-sm font-semibold text-ui-text">
                {label}
            </label>
            <input
                id={passwordId}
                type="password"
                value={password}
                disabled={disabled}
                autoComplete="current-password"
                className="input-base h-10"
                placeholder={placeholder}
                aria-invalid={errorMessage ? true : undefined}
                aria-describedby={errorMessage ? errorId : undefined}
                onChange={(event) => onPasswordChange(event.target.value)}
                onKeyDown={handleKeyDown}
            />
            {errorMessage ? (
                <p
                    id={errorId}
                    className="rounded-lg bg-ui-danger-soft px-3 py-2 text-xs font-medium text-ui-danger-soft-text"
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
