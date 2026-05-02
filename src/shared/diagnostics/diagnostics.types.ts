export type DiagnosticSeverity = 'info' | 'warn' | 'error';
export type DiagnosticCategory = 'app' | 'files' | 'export' | 'quick-add' | 'support' | 'update';

export type DiagnosticMetadataValue = string | number | boolean | null;

export interface DiagnosticEntry {
    id: string;
    timestamp: string;
    severity: DiagnosticSeverity;
    category: DiagnosticCategory;
    message: string;
    metadata?: Record<string, DiagnosticMetadataValue>;
}

export interface AppMetadata {
    appName: string;
    version: string;
    identifier: string;
    platform: string;
    arch: string;
}

export interface DiagnosticsSnapshot {
    generatedAt: string;
    app: AppMetadata;
    preferences: {
        locale: string;
        theme: 'light' | 'dark';
    };
    session: {
        quickAdd: boolean;
        fileCount: number;
        finalPageCount: number;
        optimizationPreset: string;
        imageFit: string;
        targetDpi: number | null;
        jpegQuality: number | null;
    };
    recentEvents: DiagnosticEntry[];
}
