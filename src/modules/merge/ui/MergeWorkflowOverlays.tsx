import { AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';

import type { SourceFile } from '@/capabilities/document-sources';
import type { FileEdits, FinalPage } from '@/modules/merge/model';
import type { MergeWorkflowRuntime } from './MergeWorkflow';
import { PreviewModal } from './preview';
import { TutorialOverlay } from './tutorial';

type WorkspaceLike = {
    finalPages: FinalPage[];
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
};

export function MergeWorkflowOverlays({
    runtime,
    renderProgressOverlay,
    showFinalPreview,
    setShowFinalPreview,
}: {
    runtime: MergeWorkflowRuntime;
    renderProgressOverlay: () => ReactNode;
    showFinalPreview: boolean;
    setShowFinalPreview: (value: boolean) => void;
}) {
    const workspace: WorkspaceLike = runtime.workspace;
    return (
        <>
            {renderProgressOverlay()}

            <AnimatePresence>
                {runtime.tutorial.isActive && runtime.tutorial.currentStep !== null && (
                    <TutorialOverlay
                        currentStep={runtime.tutorial.currentStep}
                        onNext={runtime.tutorial.next}
                        onSkip={runtime.tutorial.skip}
                        onComplete={runtime.tutorial.complete}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFinalPreview ? (
                    <PreviewModal
                        finalPages={workspace.finalPages}
                        files={workspace.files}
                        editsByFile={workspace.editsByFile}
                        imageFit={runtime.optimize.imageFit}
                        matchExportedImages
                        onClose={() => setShowFinalPreview(false)}
                    />
                ) : null}
            </AnimatePresence>
        </>
    );
}
