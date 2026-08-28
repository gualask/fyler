import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { type ReactNode, useState } from 'react';

import { ApplicationWindowProvider } from '@/capabilities/application-window';
import { DocumentPreviewProvider } from '@/capabilities/document-preview/preview.port';
import { DocumentSourcesProvider } from '@/capabilities/document-sources/source.port';
import { type RuntimePorts, tauriRuntimePorts } from '@/infrastructure/platform/runtime';
import { BatchCompressionProvider } from '@/modules/batch-compression/application';
import { MergeExportProvider } from '@/modules/merge/application/merge.port';
import { PageCompositionProvider } from '@/modules/page-composition/application';
import { SupportProvider } from '@/modules/support/support.port';
import { DiagnosticsProvider } from '@/shared/diagnostics';
import { PreferencesProvider } from '@/shared/preferences';
import { createAppQueryClient } from './query-client';

export function AppProviders({
    children,
    runtime = tauriRuntimePorts,
}: {
    children: ReactNode;
    runtime?: RuntimePorts;
}) {
    const [queryClient] = useState(createAppQueryClient);

    return (
        <MotionConfig reducedMotion="user">
            <QueryClientProvider client={queryClient}>
                <PreferencesProvider storage={runtime.preferencesStorage}>
                    <DocumentSourcesProvider value={runtime.documentSources}>
                        <DocumentPreviewProvider value={runtime.documentPreview}>
                            <MergeExportProvider value={runtime.mergeExport}>
                                <ApplicationWindowProvider value={runtime.applicationWindow}>
                                    <PageCompositionProvider value={runtime.pageComposition}>
                                        <SupportProvider value={runtime.support}>
                                            <BatchCompressionProvider
                                                value={runtime.batchCompression}
                                            >
                                                <DiagnosticsProvider>
                                                    {children}
                                                </DiagnosticsProvider>
                                            </BatchCompressionProvider>
                                        </SupportProvider>
                                    </PageCompositionProvider>
                                </ApplicationWindowProvider>
                            </MergeExportProvider>
                        </DocumentPreviewProvider>
                    </DocumentSourcesProvider>
                </PreferencesProvider>
            </QueryClientProvider>
        </MotionConfig>
    );
}
