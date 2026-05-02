import { PdfCacheProvider } from '@/infra/pdf';
import { useDiagnostics } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

import { AppContent } from './AppContent';
import { AppErrorBoundary } from './shell/AppErrorBoundary';
import { toReactBoundaryDiagnostic } from './shell/app-error-diagnostic';

export function AppShell() {
    const { t } = useTranslation();
    const { record } = useDiagnostics();

    return (
        <AppErrorBoundary
            title={t('errors.unhandled')}
            reloadLabel={t('errors.reload')}
            onError={(error) => {
                record(toReactBoundaryDiagnostic(error));
            }}
        >
            <PdfCacheProvider>
                <AppContent />
            </PdfCacheProvider>
        </AppErrorBoundary>
    );
}
