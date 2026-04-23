import type { FinalPage, ImageFit, SourceFile, SourceTarget } from '@/shared/domain';

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

type WorkspaceCountsLike = {
    files: readonly SourceFile[];
    finalPages: readonly FinalPage[];
    selectedFile: Pick<SourceFile, 'id'> | null;
};

type QuickAddLike = {
    isQuickAdd: boolean;
    isTransitioning: boolean;
};

type OptimizeLike = {
    optimizationPreset: string;
    imageFit: ImageFit;
    targetDpi?: number;
    jpegQuality?: number;
};

type WorkspacePreviewLike = {
    files: readonly SourceFile[];
    finalPages: readonly FinalPage[];
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

export function isTutorialReadyForAutoStart(
    quickAdd: QuickAddLike,
    workspace: WorkspaceCountsLike,
): boolean {
    return (
        !quickAdd.isQuickAdd &&
        !quickAdd.isTransitioning &&
        workspace.files.length > 0 &&
        workspace.selectedFile !== null &&
        workspace.finalPages.length > 0
    );
}

export function buildAppContentRootClassName(isTransitioning: boolean): string {
    return `flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text transition-[filter,opacity,transform] duration-400 ease-out ${isTransitioning ? 'blur-md opacity-0 scale-95' : 'blur-none opacity-100 scale-100'}`;
}

export function buildSupportDiagnosticsParams({
    isDark,
    quickAdd,
    workspace,
    optimize,
}: {
    isDark: boolean;
    quickAdd: Pick<QuickAddLike, 'isQuickAdd'>;
    workspace: Pick<WorkspacePreviewLike, 'files' | 'finalPages'>;
    optimize: OptimizeLike;
}) {
    return {
        isDark,
        isQuickAdd: quickAdd.isQuickAdd,
        fileCount: workspace.files.length,
        finalPageCount: workspace.finalPages.length,
        optimizationPreset: optimize.optimizationPreset,
        imageFit: optimize.imageFit,
        targetDpi: optimize.targetDpi,
        jpegQuality: optimize.jpegQuality,
    };
}
