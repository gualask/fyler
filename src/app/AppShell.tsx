import { PdfCacheProvider } from '@/infra/pdf';
import { useDiagnostics } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

import { AppContent } from './AppContent';
import { AppErrorBoundary } from './shell/AppErrorBoundary';

export function AppShell() {
    const { t } = useTranslation();
    const { record } = useDiagnostics();

    return (
        <AppErrorBoundary
            title={t('errors.unhandled')}
            reloadLabel={t('errors.reload')}
            onError={(message) => {
                record({
                    category: 'app',
                    severity: 'error',
                    message: `React error boundary caught an error: ${message}`,
                });
            }}
        >
            <PdfCacheProvider>
                <AppContent />
            </PdfCacheProvider>
        </AppErrorBoundary>
    );
}
