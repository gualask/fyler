/**
 * Read-only merge session data exposed to app-owned diagnostics.
 *
 * The app shell may present this snapshot, but it must not reach into the
 * merge workflow's state or construct it. Values intentionally stay as
 * strings here so this contract does not make the shared layer depend on the
 * merge module's model types.
 */
export type MergeDiagnosticsSnapshot = {
    fileCount: number;
    finalPageCount: number;
    optimizationPreset: string;
    imageFit: string;
    targetDpi?: number;
    jpegQuality?: number;
};

/** Initial values match the merge model defaults before its first snapshot. */
export const EMPTY_MERGE_DIAGNOSTICS: MergeDiagnosticsSnapshot = {
    fileCount: 0,
    finalPageCount: 0,
    optimizationPreset: 'light',
    imageFit: 'contain',
    targetDpi: 220,
    jpegQuality: 92,
};
