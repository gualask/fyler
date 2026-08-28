import { useId, useMemo } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import { PdfPagePickerView } from './PdfPagePickerView';
import { usePdfPagePickerState } from './pdf-page-picker.hook';

export function PdfPagePicker({
    file,
    onCancel,
    onConfirm,
}: {
    file: SourceFile;
    onCancel: () => void;
    onConfirm: (pageNum: number) => Promise<void>;
}) {
    const titleId = useId();
    const picker = usePdfPagePickerState(file, onCancel, onConfirm);
    const pages = useMemo(
        () => Array.from({ length: picker.pageCount }, (_, index) => index + 1),
        [picker.pageCount],
    );

    return (
        <PdfPagePickerView
            titleId={titleId}
            file={file}
            pages={pages}
            onCancel={onCancel}
            picker={picker}
        />
    );
}
