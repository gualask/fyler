export function SummaryRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-ui-border/80 py-2 text-sm last:border-b-0">
            <span className="text-ui-text-muted">{label}</span>
            <span className="truncate text-right font-medium text-ui-text">{value}</span>
        </div>
    );
}
