import { DocumentArrowUpIcon, PlusIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
    onAddFiles: () => void;
}

export function EmptyState({ onAddFiles }: EmptyStateProps) {
    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 bg-ui-bg">
            <div className="rounded-2xl border-2 border-dashed border-ui-border p-8">
                <DocumentArrowUpIcon className="h-16 w-16 text-ui-text-secondary" />
            </div>
            <button onClick={onAddFiles} className="btn-primary-lg">
                <PlusIcon className="h-5 w-5" />
                Aggiungi file
            </button>
            <p className="text-sm text-ui-text-secondary">Trascina qui PDF o immagini</p>
        </div>
    );
}
