export type AppStatusTone = 'success' | 'error' | 'warning';
export type AppToastTone = 'success' | 'warning';

export type AppNotificationsApi = {
    statusMessage: string | null;
    statusTone: AppStatusTone | null;
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
    showToast: (tone: AppToastTone, message: string) => void;
};
