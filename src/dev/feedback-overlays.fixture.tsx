import { ProgressModal, Toast } from '@/app/overlays';

type FeedbackView = 'progress' | 'progress-indeterminate' | 'toast-success' | 'toast-warning';

function getFeedbackView(search: string): FeedbackView {
    const view = new URLSearchParams(search).get('view');

    if (
        view === 'progress' ||
        view === 'progress-indeterminate' ||
        view === 'toast-success' ||
        view === 'toast-warning'
    ) {
        return view;
    }

    return 'progress';
}

export function FeedbackOverlaysFixturePage() {
    const view = getFeedbackView(window.location.search);

    return (
        <>
            <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Feedback Fixtures
                    </p>
                    <h1 className="text-2xl font-semibold">Overlay preview</h1>
                    <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Browser-safe fixture for audit passes on toast and progress overlays.
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <a href="/?dev=feedback-overlays&amp;view=progress" className="btn-ghost">
                            Progress
                        </a>
                        <a
                            href="/?dev=feedback-overlays&amp;view=progress-indeterminate"
                            className="btn-ghost"
                        >
                            Progress indeterminate
                        </a>
                        <a
                            href="/?dev=feedback-overlays&amp;view=toast-success"
                            className="btn-ghost"
                        >
                            Toast success
                        </a>
                        <a
                            href="/?dev=feedback-overlays&amp;view=toast-warning"
                            className="btn-ghost"
                        >
                            Toast warning
                        </a>
                    </div>
                </div>
            </div>

            {view === 'progress' ? (
                <ProgressModal message="Exporting fixture files" progress={72} />
            ) : null}
            {view === 'progress-indeterminate' ? (
                <ProgressModal message="Opening fixture files" />
            ) : null}
            {view === 'toast-success' ? (
                <Toast tone="success" message="Fixture success toast message" />
            ) : null}
            {view === 'toast-warning' ? (
                <Toast tone="warning" message="Fixture warning toast message" />
            ) : null}
        </>
    );
}
