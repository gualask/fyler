import type { SourceFile, SourceTarget } from '@/capabilities/document-sources';

type FocusedSourceLike = {
    target: SourceTarget;
    flashTarget: 'picker' | 'final';
    flashKey: number;
    fileId: string;
} | null;

type WorkspaceSelectionLike = {
    focusedSource: FocusedSourceLike;
    selectedFile: Pick<SourceFile, 'id'> | null;
};

export function deriveFocusedSourceState({ focusedSource, selectedFile }: WorkspaceSelectionLike): {
    focusedSourceTarget: SourceTarget | null;
    focusedSourceFlashKey?: number;
} {
    const focusedSourceMatchesSelected = Boolean(
        focusedSource && focusedSource.fileId === selectedFile?.id,
    );

    return {
        focusedSourceTarget: focusedSourceMatchesSelected ? (focusedSource?.target ?? null) : null,
        focusedSourceFlashKey: focusedSourceMatchesSelected
            ? focusedSource?.flashTarget === 'picker'
                ? focusedSource.flashKey
                : undefined
            : undefined,
    };
}
