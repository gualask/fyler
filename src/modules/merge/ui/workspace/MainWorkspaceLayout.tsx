import { useState } from 'react';
import type { WorkspaceApi } from '@/modules/merge/application';
import { toFinalPageId, useWorkspaceStoreSelector } from '@/modules/merge/model';
import type { OptimizeState } from './main-app.types';
import { OutputColumn, SourceColumn } from './main-workspace-layout/WorkspaceColumns';
import {
    FinalDocumentPreview,
    PickerPreview,
    type PickerPreviewTarget,
} from './main-workspace-layout/WorkspacePreviews';

interface Props {
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    optimize: OptimizeState;
}

export function MainWorkspaceLayout({ workspace, handleAddFiles, optimize }: Props) {
    const [pickerPreviewTarget, setPickerPreviewTarget] = useState<PickerPreviewTarget | null>(
        null,
    );
    const [finalPreviewTargetId, setFinalPreviewTargetId] = useState<string | null>(null);
    const focusedSource = useWorkspaceStoreSelector((state) => state.ui.focusedSource);
    const selectedFinalPageId = focusedSource
        ? toFinalPageId(focusedSource.fileId, focusedSource.target)
        : null;

    return (
        <>
            <div className="workspace-layout-frame workspace-layout-grid">
                <SourceColumn
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    onPreviewTarget={(file, target) => setPickerPreviewTarget({ file, target })}
                />
                <OutputColumn
                    workspace={workspace}
                    optimize={optimize}
                    selectedFinalPageId={selectedFinalPageId}
                    onPreviewPage={setFinalPreviewTargetId}
                />
            </div>

            <PickerPreview
                target={pickerPreviewTarget}
                workspace={workspace}
                imageFit={optimize.imageFit}
                onClose={() => setPickerPreviewTarget(null)}
            />
            <FinalDocumentPreview
                targetId={finalPreviewTargetId}
                workspace={workspace}
                imageFit={optimize.imageFit}
                onClose={() => setFinalPreviewTargetId(null)}
            />
        </>
    );
}
