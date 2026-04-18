import { UpdateDialogView } from '@/app/updates/UpdateDialog';

type UpdateFixtureView = 'available' | 'installing' | 'error';

function getView(search: string): UpdateFixtureView {
    const value = new URLSearchParams(search).get('view');

    if (value === 'installing' || value === 'error') {
        return value;
    }

    return 'available';
}

export function UpdateDialogFixturePage() {
    const view = getView(window.location.search);

    return (
        <>
            <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Update Fixture
                    </p>
                    <h1 className="text-2xl font-semibold">Update dialog preview</h1>
                    <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Browser-safe fixture for available, installing, and error states of the
                        updater dialog.
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <a href="/?dev=update-dialog" className="btn-ghost">
                            Available
                        </a>
                        <a href="/?dev=update-dialog&amp;view=installing" className="btn-ghost">
                            Installing
                        </a>
                        <a href="/?dev=update-dialog&amp;view=error" className="btn-ghost">
                            Error
                        </a>
                    </div>
                </div>
            </div>

            <UpdateDialogView
                updateVersion="0.2.0"
                installing={view === 'installing'}
                progress={view === 'installing' ? 72 : null}
                error={view === 'error' ? 'Network unavailable' : null}
                onInstall={() => undefined}
                onDismiss={() => undefined}
            />
        </>
    );
}
