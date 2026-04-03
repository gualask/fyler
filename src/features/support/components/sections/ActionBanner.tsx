type ActionState = {
    tone: 'success' | 'error';
    message: string;
} | null;

export function SupportActionBanner({ actionState }: { actionState: ActionState }) {
    if (!actionState) return null;

    return (
        <p
            className={[
                'rounded-lg px-3 py-2 text-sm',
                actionState.tone === 'success'
                    ? 'bg-ui-accent-soft text-ui-accent-on-soft'
                    : 'bg-ui-danger-soft text-ui-danger',
            ].join(' ')}
        >
            {actionState.message}
        </p>
    );
}
