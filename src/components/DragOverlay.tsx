import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

export function DragOverlay() {
    return (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 border-4 border-dashed border-ui-accent bg-ui-accent/20 backdrop-blur-xs">
            <DocumentArrowDownIcon className="h-12 w-12 text-ui-accent" strokeWidth={1.5} />
            <span className="text-xl font-semibold text-ui-accent">Rilascia i file qui</span>
        </div>
    );
}
