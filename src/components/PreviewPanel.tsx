import type { Doc } from '../domain';
import { PdfPreview } from './PdfPreview';

interface Props {
    selectedDoc: Doc | null;
    previewUrl: string | null;
    onStatus: (status: string) => void;
    onRotate?: (pageNum: number, angle: number) => void;
}

export function PreviewPanel({ selectedDoc, previewUrl, onStatus, onRotate }: Props) {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Anteprima</span>
                <span className="max-w-xs truncate text-xs text-ui-text-muted">
                    {selectedDoc ? selectedDoc.name : 'Nessun documento selezionato'}
                </span>
            </div>

            <div className="min-h-0 flex-1">
                {!selectedDoc ? (
                    <p className="text-sm text-ui-text-muted">
                        {"Seleziona un documento per visualizzare l'anteprima."}
                    </p>
                ) : selectedDoc.kind === 'image' ? (
                    <div className="flex h-full items-center justify-center overflow-auto rounded-lg border border-ui-border bg-ui-surface p-3">
                        <img
                            src={previewUrl!}
                            alt={selectedDoc.name}
                            className="max-h-full max-w-full object-contain"
                        />
                    </div>
                ) : (
                    <PdfPreview
                        key={selectedDoc.id}
                        url={previewUrl!}
                        onStatus={onStatus}
                        onRotate={onRotate}
                    />
                )}
            </div>
        </div>
    );
}
