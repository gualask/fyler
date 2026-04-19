import { SupportDialog } from '@/features/support';
import { SUPPORT_DIALOG_FIXTURE_SNAPSHOT } from './support.fixture-data';

export function SupportDialogFixturePage() {
    return (
        <>
            <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Bug Report Fixture
                    </p>
                    <h1 className="text-2xl font-semibold">Bug report dialog preview</h1>
                    <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Browser-safe fixture for auditing the bug report flow.
                    </p>
                </div>
            </div>

            <SupportDialog
                open
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
