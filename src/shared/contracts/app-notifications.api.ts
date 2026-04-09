export type AppStatusTone = 'success' | 'error' | 'warning';
export type AppToastTone = 'success' | 'warning';

export type AppNotificationsApi = {
    statusMessage: string | null;
    statusTone: AppStatusTone | null;
    loadingMessage: string | null;
    loadingProgress?: number;

    showOpeningFiles: () => void;
    showMergePreparing: () => void;
    clearLoading: () => void;

    showExportCompleted: () => void;
    showExportCompletedWithOptimizationWarning: (count: number) => void;

    showError: (error: unknown) => void;
    showToast: (tone: AppToastTone, message: string) => void;
};
