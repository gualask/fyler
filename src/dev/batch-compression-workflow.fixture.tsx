import { useReducer } from 'react';

import { PdfCacheProvider } from '@/infrastructure/pdfjs';
import {
    batchWorkspaceReducer,
    createBatchSources,
    currentSummary,
    runnableSources,
} from '@/modules/batch-compression/model';
import { BatchCompressionHeader } from '@/modules/batch-compression/ui/BatchCompressionHeader';
import { BatchSettingsPanel } from '@/modules/batch-compression/ui/batch-settings-panel';
import { BatchSourceList } from '@/modules/batch-compression/ui/batch-source-list';
import {
    compressionResult,
    DESTINATION,
    fixtureResults,
    initialBatchState,
    PICKED_SOURCES,
} from './batch-compression-workflow.fixture-data';
import { useFixtureWorkflowControls } from './fixture-workflow-controls';

export function BatchCompressionWorkflowFixturePage() {
    const controls = useFixtureWorkflowControls();
    const [state, dispatch] = useReducer(
        batchWorkspaceReducer,
        window.location.search,
        initialBatchState,
    );
    const summary = currentSummary(state);
    const pendingCount = runnableSources(state).length;

    const restoreSources = () => {
        const existingPaths = new Set(state.sources.map((source) => source.path));
        let nextId = state.sources.length;
        const additions = createBatchSources(
            PICKED_SOURCES,
            existingPaths,
            () => `fixture-batch-restored-${++nextId}`,
        );
        dispatch({ type: 'sourcesAdded', sources: additions });
        controls.recordAction('sample-sources-restored');
    };

    const run = () => {
        const runnable = runnableSources(state);
        const results = fixtureResults(runnable, false);
        dispatch({
            type: 'runCompleted',
            result: compressionResult(results),
            settings: state.settings,
        });
        controls.recordAction('compression-completed');
    };

    return (
        <PdfCacheProvider>
            <main
                className="flex h-screen min-h-0 flex-col overflow-hidden bg-ui-bg text-ui-text"
                data-fixture-scenario="batch-compression"
                data-fixture-last-action={controls.lastAction || undefined}
            >
                <BatchCompressionHeader
                    busy={state.isRunning}
                    renderSettingsMenu={controls.renderSettingsMenu}
                    renderAlwaysOnTopControl={controls.renderAlwaysOnTopControl}
                    onBack={controls.backToIndex}
                    pendingCount={pendingCount}
                    sourceCount={state.sources.length}
                    onRun={run}
                />
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                    {state.sources.length === 0 ? (
                        <button
                            type="button"
                            className="m-4 flex min-h-0 flex-1 items-center justify-center rounded-[1.75rem] border-2 border-dashed border-ui-border bg-ui-surface text-sm font-semibold text-ui-text-secondary hover:border-ui-accent/30 hover:bg-ui-accent-soft/25"
                            onClick={restoreSources}
                        >
                            Restore sample files
                        </button>
                    ) : (
                        <div className="workspace-layout-frame flex">
                            <div className="workspace-surface workspace-surface-source flex min-w-0 flex-1">
                                <BatchSourceList
                                    sources={state.sources}
                                    busy={state.isRunning}
                                    onAddFiles={restoreSources}
                                    onClear={() => {
                                        dispatch({ type: 'sourcesCleared' });
                                        controls.recordAction('sources-cleared');
                                    }}
                                    onRemove={(sourceId) => {
                                        dispatch({ type: 'sourceRemoved', sourceId });
                                        controls.recordAction(`source-removed-${sourceId}`);
                                    }}
                                />
                            </div>
                            <BatchSettingsPanel
                                settings={state.settings}
                                hasImageSources={state.sources.some(
                                    (source) => source.kind === 'image',
                                )}
                                destinationPath={state.destinationPath}
                                busy={state.isRunning}
                                summary={summary}
                                runProgress={state.runProgress}
                                onSettingsChange={(settings) => {
                                    dispatch({ type: 'settingsChanged', settings });
                                    controls.recordAction('compression-settings-changed');
                                }}
                                onChooseDestination={() => {
                                    dispatch({ type: 'destinationChanged', path: DESTINATION });
                                    controls.recordAction('destination-selected');
                                }}
                            />
                        </div>
                    )}
                </div>
                <p className="sr-only" role="status" aria-live="polite">
                    {controls.lastAction}
                </p>
            </main>
        </PdfCacheProvider>
    );
}
