import type { MergeNotificationsApi } from '@/modules/merge/application/notifications.port';

export type AppStatusTone = 'success' | 'error' | 'warning';
export type AppToastTone = 'success' | 'warning';

/** Global notification surface presented by the app shell. */
export type AppNotificationsApi = {
    statusMessage: string | null;
    statusTone: AppStatusTone | null;
    showError: (error: unknown) => void;
    showToast: (tone: AppToastTone, message: string) => void;
};

type PageCompositionNotificationsApi = AppNotificationsApi & {
    isBusy: boolean;
    beginOpeningFiles: () => boolean;
    finishOpeningFiles: () => void;
    beginPageComposition: () => boolean;
    finishPageComposition: () => void;
    showExportCompleted: () => void;
};

/** Concrete app implementation composed with workflow-owned consumer ports. */
export type NotificationsApi = AppNotificationsApi &
    MergeNotificationsApi &
    PageCompositionNotificationsApi & {
        updateOpeningFilesProgress: (completed: number, total: number) => void;
    };
