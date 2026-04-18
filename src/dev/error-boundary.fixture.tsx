import { AppErrorBoundary } from '@/app/shell/AppErrorBoundary';
import { useTranslation } from '@/shared/i18n';

function getFixtureMessage(search: string): string {
    const message = new URLSearchParams(search).get('message')?.trim();
    return message || 'Fixture crash while rendering the workspace shell.';
}

function CrashOnRender({ message }: { message: string }): null {
    throw new Error(message);
}

export function ErrorBoundaryFixturePage() {
    const { t } = useTranslation();
    const message = getFixtureMessage(window.location.search);

    return (
        <AppErrorBoundary title={t('errors.unhandled')} reloadLabel={t('errors.reload')}>
            <CrashOnRender message={message} />
        </AppErrorBoundary>
    );
}
