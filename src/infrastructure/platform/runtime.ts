import type { ApplicationWindowPort } from '@/capabilities/application-window';
import type { DocumentPreviewPort } from '@/capabilities/document-preview/preview.types';
import type { DocumentSourcesPort } from '@/capabilities/document-sources/source.port';
import type { BatchCompressionPort } from '@/modules/batch-compression/application';
import type { MergeExportPort } from '@/modules/merge/application/merge.port';
import type { PageCompositionPort } from '@/modules/page-composition/application';
import type { SupportPort } from '@/modules/support/support.port';
import type { PreferencesStorage } from '@/shared/preferences/preferences.storage';
import { preferencesStorage } from './preferences.storage';
import { tauriBatchCompression } from './tauri-batch-compression';
import { tauriDocumentPreview } from './tauri-document-preview';
import { tauriDocumentSources } from './tauri-document-sources';
import { tauriMergeExport } from './tauri-merge';
import { tauriPageComposition } from './tauri-page-composition';
import { tauriSupport } from './tauri-support';
import { tauriApplicationWindow } from './tauri-window';

/** All runtime boundaries composed by the app shell. Each field remains a focused port. */
export type RuntimePorts = {
    batchCompression: BatchCompressionPort;
    documentSources: DocumentSourcesPort;
    documentPreview: DocumentPreviewPort;
    mergeExport: MergeExportPort;
    applicationWindow: ApplicationWindowPort;
    pageComposition: PageCompositionPort;
    support: SupportPort;
    preferencesStorage: PreferencesStorage;
};

export const tauriRuntimePorts: RuntimePorts = {
    batchCompression: tauriBatchCompression,
    documentSources: tauriDocumentSources,
    documentPreview: tauriDocumentPreview,
    mergeExport: tauriMergeExport,
    applicationWindow: tauriApplicationWindow,
    pageComposition: tauriPageComposition,
    support: tauriSupport,
    preferencesStorage,
};
