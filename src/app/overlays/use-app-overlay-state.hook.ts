import { useState } from 'react';
import { useSupportDiagnostics } from '@/features/support';
import type { FinalPage, ImageFit, SourceFile } from '@/shared/domain';
import { buildSupportDiagnosticsParams } from '../app-content.selectors';

type QuickAddLike = {
    isQuickAdd: boolean;
};

type OptimizeLike = {
    optimizationPreset: string;
    imageFit: ImageFit;
    targetDpi?: number;
    jpegQuality?: number;
};

type WorkspaceLike = {
    files: SourceFile[];
    finalPages: FinalPage[];
};

export function useAppOverlayState({
    isDark,
    quickAdd,
    workspace,
    optimize,
}: {
    isDark: boolean;
    quickAdd: QuickAddLike;
    workspace: WorkspaceLike;
    optimize: OptimizeLike;
}) {
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const support = useSupportDiagnostics(
        buildSupportDiagnosticsParams({
            isDark,
            quickAdd,
            workspace,
            optimize,
        }),
    );

    return {
        support,
        showFinalPreview,
        setShowFinalPreview,
    };
}
