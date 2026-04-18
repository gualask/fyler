import { SupportDialog } from '@/features/support';
import { SUPPORT_DIALOG_FIXTURE_SNAPSHOT } from './support.fixture-data';

function getFixtureMode(search: string): 'report' | 'about' {
    const mode = new URLSearchParams(search).get('mode');
    return mode === 'about' ? 'about' : 'report';
}

export function SupportDialogFixturePage() {
    const mode = getFixtureMode(window.location.search);

    return (
        <>
            <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Support Fixture
                    </p>
                    <h1 className="text-2xl font-semibold">Support dialog preview</h1>
                    <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Browser-safe fixture for auditing the support dialog in both report and
                        about modes.
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <a href="/?dev=support-dialog" className="btn-ghost">
                            Report mode
                        </a>
                        <a href="/?dev=support-dialog&amp;mode=about" className="btn-ghost">
                            About mode
                        </a>
                    </div>
                </div>
            </div>

            <SupportDialog
                mode={mode}
                snapshot={SUPPORT_DIALOG_FIXTURE_SNAPSHOT}
                onClose={() => undefined}
                onCopyDiagnostics={async () => undefined}
                onSaveDiagnosticsFile={async () => ''}
                onOpenGitHubIssue={async () => 'prefilled'}
                onShowToast={() => undefined}
                onShowError={() => undefined}
            />
        </>
    );
}
