import { formatDiagnosticMetadataInline } from './diagnostics.metadata';
import type { DiagnosticsSnapshot } from './diagnostics.types';

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
                `- [${entry.timestamp}] ${entry.severity.toUpperCase()} ${entry.category}: ${entry.message}${formatDiagnosticMetadataInline(entry.metadata)}`,
            );
        }
    }

    return lines.join('\n');
}
