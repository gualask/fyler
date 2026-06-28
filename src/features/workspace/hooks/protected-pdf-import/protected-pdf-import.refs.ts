import type { PendingPasswordImport } from './protected-pdf-import.logic';

export type PendingPasswordImportRef = {
    current: PendingPasswordImport | null;
};

export type UnlockInFlightRef = {
    current: boolean;
};
