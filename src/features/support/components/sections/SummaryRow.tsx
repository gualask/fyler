export function SummaryRow({
    label,
    value,
    wrapValue = false,
}: {
    label: string;
    value: string | number;
    wrapValue?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 text-[13px] last:border-b-0">
            <dt className="min-w-0 text-ui-text-muted">{label}</dt>
            <dd
                className={[
                    'min-w-0 text-right font-medium text-ui-text',
                    wrapValue ? 'max-w-[58%] [overflow-wrap:anywhere]' : 'truncate',
                ].join(' ')}
            >
                {value}
            </dd>
        </div>
    );
}
