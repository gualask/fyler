import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Loads a PDF document from a URL and manages its lifecycle.
 * Cancels in-flight loads and destroys the document on cleanup.
 */
export function usePdfDocument(url: string, onStatus?: (s: string) => void) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pageCount, setPageCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setDoc(null);
        setPageCount(0);
        onStatus?.('Caricamento PDF…');

        const task = pdfjsLib.getDocument({ url });

        (async () => {
            onStatus?.('Download/lettura…');
            const loaded = await task.promise;
            if (cancelled) return;
            setDoc(loaded);
            setPageCount(loaded.numPages);
            onStatus?.(`PDF caricato (${loaded.numPages} pagine)`);
        })()
            .catch((e: unknown) => {
                if (cancelled) return;
                const msg = e instanceof Error ? e.message : String(e);
                setError(msg);
                onStatus?.(`Errore: ${msg}`);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            void task.destroy();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url]);

    useEffect(() => {
        return () => {
            if (doc) void doc.destroy();
        };
    }, [doc]);

    return { doc, pageCount, loading, error };
}
