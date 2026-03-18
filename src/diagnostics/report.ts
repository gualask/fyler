import type { DiagnosticMetadataValue, DiagnosticsSnapshot } from './types';

function formatMetadata(metadata: Record<string, DiagnosticMetadataValue> | undefined): string {
    if (!metadata) return '';
    const pairs = Object.entries(metadata).map(([key, value]) => `${key}=${value}`);
    return pairs.length ? ` (${pairs.join(', ')})` : '';
}

export function formatDiagnosticsReport(snapshot: DiagnosticsSnapshot): string {
    const lines = [
        'Fyler Diagnostics',
        '',
        `Generated: ${snapshot.generatedAt}`,
        '',
        'App',
        `- Name: ${snapshot.app.appName}`,
        `- Version: ${snapshot.app.version}`,
        `- Identifier: ${snapshot.app.identifier}`,
        `- Platform: ${snapshot.app.platform}`,
        `- Architecture: ${snapshot.app.arch}`,
        '',
        'Preferences',
        `- Locale: ${snapshot.preferences.locale}`,
        `- Theme: ${snapshot.preferences.theme}`,
        '',
        'Session',
        `- Quick Add: ${snapshot.session.quickAdd ? 'on' : 'off'}`,
        `- Files loaded: ${snapshot.session.fileCount}`,
        `- Final pages: ${snapshot.session.finalPageCount}`,
        `- Optimization preset: ${snapshot.session.optimizationPreset}`,
        `- Image fit: ${snapshot.session.imageFit}`,
        `- Target DPI: ${snapshot.session.targetDpi ?? 'off'}`,
        `- JPEG quality: ${snapshot.session.jpegQuality ?? 'auto'}`,
        '',
        'Recent Events',
    ];

    if (!snapshot.recentEvents.length) {
        lines.push('- No recent events recorded.');
    } else {
        for (const entry of [...snapshot.recentEvents].reverse()) {
            lines.push(
                `- [${entry.timestamp}] ${entry.severity.toUpperCase()} ${entry.category}: ${entry.message}${formatMetadata(entry.metadata)}`,
            );
        }
    }

    return lines.join('\n');
}
