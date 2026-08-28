/**
 * Notification surface consumed by the active merge workflow.
 *
 * The app shell implements this port, while merge owns its loading lifecycle and export outcomes.
 */
export type MergeNotificationsApi = {
    isBusy: boolean;
    loadingMessage: string | null;
    loadingProgress?: number;
    loadingProgressLabel?: string;
    loadingElapsedTimeLabel?: string;

    beginOpeningFiles: () => boolean;
    finishOpeningFiles: () => void;
    beginMerge: () => boolean;
    finishMerge: () => void;

    showExportCompleted: () => void;
    showExportCompletedWithOptimizationWarning: (count: number) => void;

    showError: (error: unknown) => void;
    showToast: (tone: 'success' | 'warning', message: string) => void;
};
