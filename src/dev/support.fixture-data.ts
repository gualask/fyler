import type { DiagnosticsSnapshot } from '@/shared/diagnostics';

export const SUPPORT_DIALOG_FIXTURE_SNAPSHOT: DiagnosticsSnapshot = {
    generatedAt: '2026-04-17T09:00:00.000Z',
    app: {
        appName: 'Fyler',
        version: '0.1.0',
        identifier: 'com.gualask.fyler',
        platform: 'macOS',
        arch: 'arm64',
    },
    preferences: {
        locale: 'it',
        theme: 'light',
    },
    session: {
        quickAdd: false,
        fileCount: 5,
        finalPageCount: 18,
        optimizationPreset: 'light',
        imageFit: 'contain',
        targetDpi: 220,
        jpegQuality: null,
    },
    recentEvents: [
        {
            id: 'fixture-event-1',
            timestamp: '2026-04-17T08:58:00.000Z',
            severity: 'warn',
            category: 'export',
            message: 'Some images were exported without optimization.',
            metadata: { skipped: 2 },
        },
        {
            id: 'fixture-event-2',
            timestamp: '2026-04-17T08:56:00.000Z',
            severity: 'info',
            category: 'files',
            message: 'Imported files from fixture workspace.',
            metadata: { count: 5 },
        },
        {
            id: 'fixture-event-3',
            timestamp: '2026-04-17T08:54:00.000Z',
            severity: 'error',
            category: 'support',
            message: 'Sample support error for dialog preview.',
            metadata: { source: 'fixture' },
        },
    ],
};
