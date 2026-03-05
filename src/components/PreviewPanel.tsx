import type { Doc } from '../domain';
import { PdfPreview } from './PdfPreview';

/** Props for the right-side PDF preview panel. */
interface Props {
    selectedDoc: Doc | null;
    previewUrl: string | null;
    onStatus: (status: string) => void;
    onRotate?: (pageNum: number, angle: number) => void;
}

/**
 * Right panel: renders the selected document via {@link PdfPreview},
 * or a placeholder when no document is selected.
 */
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
                {selectedDoc ? (
                    <PdfPreview
                        key={selectedDoc.id}
                        url={previewUrl!}
                        onStatus={onStatus}
                        onRotate={onRotate}
                    />
                ) : (
                    <p className="text-sm text-ui-text-muted">
                        {"Seleziona un documento per visualizzare l'anteprima."}
                    </p>
                )}
            </div>
        </div>
    );
}
