import type { ReactNode } from 'react';
import { PdfCacheProvider } from '@/infrastructure/pdfjs';
import { useTranslation } from '@/shared/i18n';
import { DragOverlay } from '@/shared/ui/workspace/DragOverlay';
import { EmptyState } from '@/shared/ui/workspace/EmptyState';
import { useBatchWorkspace } from '../application';
import { BatchCompressionHeader } from './BatchCompressionHeader';
import { BatchSettingsPanel } from './batch-settings-panel';
import { BatchSourceList } from './batch-source-list';

function BatchCompressionWorkspace({
    notifications,
    onExit,
    renderSettingsMenu,
    renderAlwaysOnTopControl,
    renderProgressOverlay,
}: {
    notifications: Parameters<typeof useBatchWorkspace>[0];
    onExit: () => void;
    renderSettingsMenu: () => ReactNode;
    renderAlwaysOnTopControl: () => ReactNode;
    renderProgressOverlay: () => ReactNode;
}) {
    const { t } = useTranslation();
    const workspace = useBatchWorkspace(notifications, t);
    const { state, summary } = workspace;
    const hasImageSources = state.sources.some((source) => source.kind === 'image');
    const completedCount =
        summary.compressed + summary.alreadyOptimized + summary.skipped + summary.failed;
    const liveMessage = state.isRunning
        ? t('batch.live.running', {
              completed: state.runProgress?.completed ?? 0,
              total: state.runProgress?.total ?? 0,
          })
        : completedCount > 0
          ? t('batch.live.completed', {
                compressed: summary.compressed,
                optimized: summary.alreadyOptimized,
                skipped: summary.skipped,
                failed: summary.failed,
            })
          : '';

    return (
        <main
            className="flex h-screen min-h-0 flex-col overflow-hidden bg-ui-bg text-ui-text"
            aria-busy={workspace.isBusy}
        >
            <BatchCompressionHeader
                busy={workspace.isBusy}
                renderSettingsMenu={renderSettingsMenu}
                renderAlwaysOnTopControl={renderAlwaysOnTopControl}
                onBack={onExit}
                pendingCount={workspace.pendingCount}
                sourceCount={state.sources.length}
                onRun={workspace.run}
            />
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {workspace.isDragActive ? <DragOverlay /> : null}

                {state.sources.length === 0 ? (
                    <div className="absolute inset-0 z-10 flex flex-col bg-ui-bg p-3 md:p-4">
                        <EmptyState onAddFiles={workspace.addSources} />
                    </div>
                ) : (
                    <div className="workspace-layout-frame flex">
                        <div className="workspace-surface workspace-surface-source flex min-w-0 flex-1">
                            <BatchSourceList
                                sources={state.sources}
                                busy={workspace.isBusy}
                                onAddFiles={workspace.addSources}
                                onClear={workspace.clearSources}
                                onRemove={workspace.removeSource}
                            />
                        </div>
                        <BatchSettingsPanel
                            settings={state.settings}
                            hasImageSources={hasImageSources}
                            destinationPath={state.destinationPath}
                            busy={workspace.isBusy}
                            summary={summary}
                            runProgress={state.runProgress}
                            onSettingsChange={workspace.changeSettings}
                            onChooseDestination={workspace.chooseDestination}
                        />
                    </div>
                )}
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {liveMessage}
            </p>
            {renderProgressOverlay()}
        </main>
    );
}

export function BatchCompressionWorkflow(props: Parameters<typeof BatchCompressionWorkspace>[0]) {
    return (
        <PdfCacheProvider>
            <BatchCompressionWorkspace {...props} />
        </PdfCacheProvider>
    );
}
