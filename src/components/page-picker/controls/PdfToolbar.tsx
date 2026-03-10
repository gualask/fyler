import { ColumnHeader } from '../../shared/layout/ColumnHeader';

interface Props {
    fileId: string;
    pageCount: number;
    gotoInput: string;
    specInput: string;
    pageSpecError: string;
    allSelected: boolean;
    onGotoInputChange: (value: string) => void;
    onSpecInputChange: (value: string) => void;
    onGotoSubmit: () => void;
    onSpecApply: () => void;
    onToggleAll: () => void;
}

export function PdfToolbar({
    fileId,
    pageCount,
    gotoInput,
    specInput,
    pageSpecError,
    allSelected,
    onGotoInputChange,
    onSpecInputChange,
    onGotoSubmit,
    onSpecApply,
    onToggleAll,
}: Props) {
    return (
        <>
            <ColumnHeader title="Pagine">
                <div className="flex min-w-0 items-center gap-2">
                    <label htmlFor={`goto-page-${fileId}`} className="column-toolbar-label">
                        Vai a
                    </label>
                    <input
                        id={`goto-page-${fileId}`}
                        type="number"
                        min={1}
                        max={pageCount}
                        value={gotoInput}
                        placeholder="Es. 5"
                        onChange={(event) => onGotoInputChange(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && onGotoSubmit()}
                        className="input-base h-[34px] w-16 min-w-0"
                    />
                </div>
                <div className="flex min-w-0 items-center gap-2">
                    <label htmlFor={`page-range-${fileId}`} className="column-toolbar-label">
                        Range
                    </label>
                    <input
                        id={`page-range-${fileId}`}
                        type="text"
                        placeholder="Es. 1-5, 8"
                        value={specInput}
                        onChange={(event) => onSpecInputChange(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && onSpecApply()}
                        className="input-base h-[34px] w-32 min-w-0"
                    />
                </div>
                <button
                    onClick={onToggleAll}
                    className={[
                        'h-[34px] shrink-0 rounded-lg border px-3 text-[10px] font-bold uppercase tracking-wide transition-colors',
                        allSelected ? 'toggle-on' : 'toggle-off',
                    ].join(' ')}
                >
                    {allSelected ? 'Nessuna' : 'Tutti'}
                </button>
            </ColumnHeader>

            {pageSpecError && (
                <div className="shrink-0 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-500">
                    {pageSpecError}
                </div>
            )}
        </>
    );
}
