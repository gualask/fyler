import { useEffect, useRef, useState } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import { usePdfCache } from '@/infrastructure/pdfjs';
import { useModalFocus } from '@/shared/ui';

export type PickerStatus = 'loading' | 'ready' | 'confirming' | 'error';

function usePdfDocumentLoad(
    file: SourceFile,
    getPdfDocument: ReturnType<typeof usePdfCache>['getPdfDocument'],
    setPageCount: (count: number) => void,
    setSelected: (pageNum: number) => void,
    setStatus: (status: PickerStatus) => void,
) {
    useEffect(() => {
        let active = true;
        void getPdfDocument(file)
            .then((document) => {
                if (!active) return;
                setPageCount(document.numPages);
                setSelected(1);
                setStatus('ready');
            })
            .catch(() => {
                if (active) setStatus('error');
            });
        return () => {
            active = false;
        };
    }, [file, getPdfDocument, setPageCount, setSelected, setStatus]);
}

export function usePdfPagePickerState(
    file: SourceFile,
    onCancel: () => void,
    onConfirm: (pageNum: number) => Promise<void>,
) {
    const { getPdfDocument } = usePdfCache();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
    const [pageCount, setPageCount] = useState(file.pageCount ?? 0);
    const [selected, setSelected] = useState(1);
    const [status, setStatus] = useState<PickerStatus>('loading');

    useModalFocus({
        containerRef: dialogRef,
        onEscape: status === 'confirming' ? undefined : onCancel,
    });
    usePdfDocumentLoad(file, getPdfDocument, setPageCount, setSelected, setStatus);

    const confirm = async () => {
        setStatus('confirming');
        try {
            await onConfirm(selected);
        } catch {
            setStatus('ready');
        }
    };

    return {
        dialogRef,
        scrollRoot,
        setScrollRoot,
        pageCount,
        selected,
        setSelected,
        status,
        confirm,
    };
}

export type PdfPagePickerState = ReturnType<typeof usePdfPagePickerState>;
