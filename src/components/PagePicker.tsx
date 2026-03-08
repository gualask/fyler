import { useRef, useState } from 'react';
import {
    CheckIcon,
    MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline';
import type { SourceFile, FinalPage } from '../domain';
import { useThumbnailCache } from '../hooks/useThumbnailCache';
import { getPreviewUrl } from '../platform';
import { PreviewModal } from './PreviewModal';

interface Props {
    file: SourceFile | null;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onToggleRange: (fileId: string, from: number, to: number) => void;
    onSetFromSpec: (fileId: string, spec: string, total: number) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
}

function PdfThumbnailItem({
    filePath,
    pageNum,
    isSelected,
    onClick,
    onPreview,
}: {
    filePath: string;
    pageNum: number;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
    onPreview: () => void;
}) {
    const { getThumbnail } = useThumbnailCache();
    const dataUrl = getThumbnail(getPreviewUrl(filePath), pageNum);

    return (
        <div className="flex flex-col">
            <div
                data-page={pageNum}
                onClick={onClick}
                className={[
                    'group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border-2 transition-all active:scale-95',
                    isSelected
                        ? 'border-ui-accent shadow-sm'
                        : 'border-transparent hover:border-ui-accent/50 hover:shadow-md',
                ].join(' ')}
            >
                {dataUrl ? (
                    <img
                        src={dataUrl}
                        alt={`p.${pageNum}`}
                        className="block h-full w-full bg-white object-contain"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-zinc-800">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-ui-accent-muted border-t-transparent" />
                    </div>
                )}

                {/* Hover overlay con zoom */}
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/10 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-black/20">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview();
                        }}
                        className={[
                            'flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-colors',
                            isSelected
                                ? 'bg-ui-accent/80 text-white hover:bg-ui-accent'
                                : 'bg-slate-800/80 text-white hover:bg-slate-900',
                        ].join(' ')}
                    >
                        <MagnifyingGlassPlusIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Badge selezionato */}
                {isSelected && (
                    <div className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ui-accent shadow-md">
                        <CheckIcon className="h-3 w-3 text-white" />
                    </div>
                )}
            </div>

            <p
                className={[
                    'mt-1.5 text-center text-[10px]',
                    isSelected ? 'font-bold text-ui-accent' : 'font-medium text-ui-text-muted',
                ].join(' ')}
            >
                Pagina {pageNum}
            </p>
        </div>
    );
}

export function PagePicker({
    file,
    finalPages,
    onTogglePage,
    onToggleRange,
    onSetFromSpec,
    onSelectAll,
    onDeselectAll,
}: Props) {
    const [specInput, setSpecInput] = useState('');
    const [gotoInput, setGotoInput] = useState('');
    const [previewPage, setPreviewPage] = useState<number | null>(null);
    const lastClickedPage = useRef<number | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    useThumbnailCache(); // mantiene il context attivo per i figli

    if (!file) {
        return (
            <div className="flex h-full items-center justify-center text-ui-text-muted">
                <p className="text-xs">Seleziona un file</p>
            </div>
        );
    }

    const selectedPageNums = new Set(
        finalPages.filter((fp) => fp.fileId === file.id).map((fp) => fp.pageNum),
    );

    const allSelected = file.pageCount > 0 && selectedPageNums.size === file.pageCount;

    const handleThumbClick = (pageNum: number, e: React.MouseEvent) => {
        if (e.shiftKey && lastClickedPage.current !== null) {
            onToggleRange(file.id, lastClickedPage.current, pageNum);
        } else {
            onTogglePage(file.id, pageNum);
        }
        lastClickedPage.current = pageNum;
    };

    const handleGoto = () => {
        const n = parseInt(gotoInput, 10);
        if (!n || n < 1 || n > file.pageCount) return;
        const el = gridRef.current?.querySelector(`[data-page="${n}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    const handleSpecApply = () => {
        onSetFromSpec(file.id, specInput, file.pageCount);
    };

    const handleToggleAll = () => {
        if (allSelected) {
            onDeselectAll(file.id);
        } else {
            onSelectAll(file);
        }
    };

    if (file.kind === 'image') {
        const imageUrl = getPreviewUrl(file.path);
        return (
            <>
                <div className="flex h-full flex-col overflow-hidden">
                    <div className="shrink-0 border-b border-ui-border px-4 py-3">
                        <h3 className="truncate text-[10px] font-bold uppercase tracking-widest text-ui-text-muted">
                            {file.name}
                        </h3>
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
                        <div
                            className="group relative cursor-pointer"
                            onClick={() => setPreviewPage(-1)}
                        >
                            <img
                                src={imageUrl}
                                alt={file.name}
                                className="max-h-48 max-w-full rounded-lg object-contain shadow-sm"
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/10 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-black/20">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewPage(-1);
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-white shadow-lg hover:bg-slate-900"
                                >
                                    <MagnifyingGlassPlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <span className="text-xs text-ui-text-muted">Inclusa automaticamente</span>
                    </div>
                </div>

                {previewPage === -1 && (
                    <PreviewModal
                        finalPages={[{ id: 'preview', fileId: file.id, pageNum: 0 }]}
                        files={[file]}
                        onClose={() => setPreviewPage(null)}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <div className="flex h-full flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="shrink-0 border-b border-ui-border px-4 py-4">
                    <h2 className="mb-3 truncate text-[10px] font-bold uppercase tracking-widest text-ui-text-muted">
                        Pagine di {file.name}
                    </h2>
                    <div className="flex gap-2">
                        {/* Vai a */}
                        <div className="flex flex-[1] flex-col gap-1">
                            <label className="px-1 text-[10px] font-bold uppercase tracking-wide text-ui-text-muted">
                                Vai a
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={file.pageCount}
                                value={gotoInput}
                                placeholder="Es. 5"
                                onChange={(e) => setGotoInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGoto()}
                                className="input-base"
                            />
                        </div>
                        {/* Range */}
                        <div className="flex flex-[2] flex-col gap-1">
                            <label className="px-1 text-[10px] font-bold uppercase tracking-wide text-ui-text-muted">
                                Range
                            </label>
                            <input
                                type="text"
                                placeholder="Es. 1-5, 8"
                                value={specInput}
                                onChange={(e) => setSpecInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSpecApply()}
                                className="input-base"
                            />
                        </div>
                        {/* Toggle tutti */}
                        <div className="flex flex-col justify-end gap-1">
                            <div className="invisible text-[10px]">_</div>
                            <button
                                onClick={handleToggleAll}
                                className={[
                                    'h-[38px] rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wide transition-colors',
                                    allSelected
                                        ? 'toggle-on'
                                        : 'toggle-off',
                                ].join(' ')}
                            >
                                {allSelected ? 'Nessuna' : 'Tutti'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Griglia thumbnail */}
                <div ref={gridRef} className="min-h-0 flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: file.pageCount }, (_, i) => i + 1).map((pageNum) => (
                            <PdfThumbnailItem
                                key={pageNum}
                                filePath={file.path}
                                pageNum={pageNum}
                                isSelected={selectedPageNums.has(pageNum)}
                                onClick={(e) => handleThumbClick(pageNum, e)}
                                onPreview={() => setPreviewPage(pageNum)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {previewPage !== null && previewPage > 0 && (
                <PreviewModal
                    finalPages={[{ id: 'preview', fileId: file.id, pageNum: previewPage }]}
                    files={[file]}
                    onClose={() => setPreviewPage(null)}
                />
            )}
        </>
    );
}
