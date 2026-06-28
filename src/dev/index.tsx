import type { ComponentType } from 'react';
import { AppShell } from '@/app/AppShell';
import { AppProviders } from '@/app/providers';
import {
    NORMAL_WINDOW_MIN_SIZE,
    QUICK_ADD_WINDOW_SIZE,
} from '@/features/workspace/quick-add/quick-add-window-transition';
import { setPlatformAdapter } from '@/infra/platform';
import type { PlatformAdapter } from '@/infra/platform/platform-adapter';

import { browserPlatformAdapter } from './browser-platform-adapter';
import { DevModeShell } from './DevModeShell';
import {
    DEV_FIXTURE_INDEX_KEY,
    DEV_RUNTIME_APP_KEY,
    getDevFixtureHref,
    getDevFixtureKey,
} from './dev-mode';
import { ErrorBoundaryFixturePage } from './error-boundary.fixture';
import { FeedbackOverlaysFixturePage } from './feedback-overlays.fixture';
import { FinalDocumentFixturePage } from './final-document.fixture';
import { PagePickerFixturePage } from './page-picker.fixture';
import { PreviewModalFixturePage } from './preview-modal.fixture';
import { QuickAddFixturePage } from './quick-add.fixture';
import { SupportDialogFixturePage } from './support-dialog.fixture';
import { TutorialOverlayFixturePage } from './tutorial-overlay.fixture';
import { UpdateDialogFixturePage } from './update-dialog.fixture';
import { WorkspaceEmptyFixturePage } from './workspace-empty.fixture';
import { WorkspacePreviewFixturePage } from './workspace-preview.fixture';
import { WorkspaceShellFixturePage } from './workspace-shell.fixture';

function BrowserRuntimeAppPage() {
    return <AppShell />;
}

interface WindowSize {
    width: number;
    height: number;
}

interface DevFixtureEntry {
    key: string;
    title: string;
    description: string;
    Component: ComponentType;
    adapter?: PlatformAdapter;
    // Window the fixture represents; defaults to the normal window minimum.
    minSize?: WindowSize;
}

const DEV_FIXTURES: DevFixtureEntry[] = [
    {
        key: DEV_RUNTIME_APP_KEY,
        title: 'Runtime app',
        description:
            'Real app shell mounted on the browser-safe dev adapter, without the Tauri runtime.',
        Component: BrowserRuntimeAppPage,
    },
    {
        key: 'workspace-shell',
        title: 'Workspace shell',
        description: 'Technical browser-safe workspace baseline with sample sources.',
        Component: WorkspaceShellFixturePage,
    },
    {
        key: 'workspace-preview',
        title: 'Workspace preview',
        description:
            'Realistic working session with mixed PDF/image content. Add &selected=image for the image picker.',
        Component: WorkspacePreviewFixturePage,
    },
    {
        key: 'workspace-empty',
        title: 'Workspace empty',
        description: 'Empty-state workspace fixture.',
        Component: WorkspaceEmptyFixturePage,
    },
    {
        key: 'preview-modal',
        title: 'Preview modal',
        description: 'Browser-safe preview modal. Add &pages=1 for the single-page variant.',
        Component: PreviewModalFixturePage,
    },
    {
        key: 'quick-add',
        title: 'Quick add',
        description: 'Browser-safe quick-add fixture, clamped to the compact Quick Add window.',
        Component: QuickAddFixturePage,
        minSize: QUICK_ADD_WINDOW_SIZE,
    },
    {
        key: 'support-dialog',
        title: 'Support dialog',
        description: 'Support/diagnostics dialog fixture.',
        Component: SupportDialogFixturePage,
    },
    {
        key: 'tutorial-overlay',
        title: 'Tutorial overlay',
        description: 'Tutorial overlay fixture. Add &step=0..6 to inspect targets.',
        Component: TutorialOverlayFixturePage,
    },
    {
        key: 'feedback-overlays',
        title: 'Feedback overlays',
        description:
            'Progress and toast overlays. Add &view=progress | progress-indeterminate | toast-success | toast-warning.',
        Component: FeedbackOverlaysFixturePage,
    },
    {
        key: 'final-document',
        title: 'Final document',
        description: 'Populated final-document list fixture.',
        Component: FinalDocumentFixturePage,
    },
    {
        key: 'page-picker',
        title: 'Page picker',
        description: 'PDF page-picker fixture. Add &mode=image for the image panel.',
        Component: PagePickerFixturePage,
    },
    {
        key: 'update-dialog',
        title: 'Update dialog',
        description:
            'Update dialog fixture. Add &view=installing or &view=error for alternate states.',
        Component: UpdateDialogFixturePage,
    },
    {
        key: 'error-boundary',
        title: 'Error boundary',
        description:
            'App error-boundary fallback fixture. Add &message=... to override the crash text.',
        Component: ErrorBoundaryFixturePage,
    },
];

function DevIndexPage() {
    return (
        <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Dev Fixtures
                    </p>
                    <h1 className="text-3xl font-semibold">Fixture index</h1>
                    <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Browser-safe fixture pages for DOM inspection, layout debugging, and
                        Playwright runs without depending on the native Tauri runtime. Use
                        <code className="mx-1 rounded bg-ui-accent-soft px-1.5 py-0.5 text-xs">
                            {DEV_RUNTIME_APP_KEY}
                        </code>
                        to mount the real shell on the dev adapter.
                    </p>
                </div>

                <div className="rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-sm">
                    <ul className="space-y-3">
                        {DEV_FIXTURES.map((fixture) => (
                            <li key={fixture.key}>
                                <a
                                    href={getDevFixtureHref(fixture.key)}
                                    className="flex flex-col gap-1 rounded-lg border border-ui-border bg-ui-surface-subtle px-3 py-2.5 transition-colors hover:bg-ui-surface-hover"
                                >
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="text-sm font-medium text-ui-text">
                                            {fixture.title}
                                        </span>
                                        <code className="shrink-0 text-xs text-ui-text-muted">
                                            {fixture.key}
                                        </code>
                                    </div>
                                    <span className="text-xs leading-5 text-ui-text-secondary">
                                        {fixture.description}
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="text-sm text-ui-text-muted">
                    <a href="/" className="underline decoration-ui-border hover:text-ui-text">
                        Open normal app
                    </a>
                </div>
            </div>
        </div>
    );
}

function UnknownFixturePage({ fixtureKey }: { fixtureKey: string }) {
    return (
        <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-2xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Dev Fixtures
                    </p>
                    <h1 className="text-2xl font-semibold">Unknown fixture</h1>
                    <p className="text-sm text-ui-text-secondary">
                        No fixture is registered for <code>{fixtureKey}</code>.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <a href={getDevFixtureHref(DEV_FIXTURE_INDEX_KEY)} className="btn-ghost">
                        Back to fixtures
                    </a>
                    <a href="/" className="btn-primary">
                        Open normal app
                    </a>
                </div>
            </div>
        </div>
    );
}

export function DevModePage() {
    const fixtureKey = getDevFixtureKey(window.location.search);
    const fixture =
        fixtureKey && fixtureKey !== DEV_FIXTURE_INDEX_KEY
            ? DEV_FIXTURES.find((entry) => entry.key === fixtureKey)
            : undefined;
    setPlatformAdapter(fixture?.adapter ?? browserPlatformAdapter);
    const minSize = fixture?.minSize ?? NORMAL_WINDOW_MIN_SIZE;

    const view =
        !fixtureKey || fixtureKey === DEV_FIXTURE_INDEX_KEY ? (
            <DevIndexPage />
        ) : fixture ? (
            <fixture.Component />
        ) : (
            <UnknownFixturePage fixtureKey={fixtureKey} />
        );

    return (
        <AppProviders>
            <DevModeShell minWidth={minSize.width} minHeight={minSize.height}>
                {view}
            </DevModeShell>
        </AppProviders>
    );
}
