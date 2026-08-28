import type { ComponentType } from 'react';
import { AppShell } from '@/app/AppShell';
import { AppProviders } from '@/app/providers';
import { NORMAL_APP_WINDOW_MIN_SIZE } from '@/capabilities/application-window';
import type { RuntimePorts } from '@/infrastructure/platform/runtime';

import { BatchCompressionWorkflowFixturePage } from './batch-compression-workflow.fixture';
import { browserRuntimePorts } from './browser-runtime-ports';
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
import type { DevFixtureContract } from './fixture-contract';
import { PageCompositionWorkflowFixturePage } from './page-composition-workflow.fixture';
import { PagePickerFixturePage } from './page-picker.fixture';
import { PreviewModalFixturePage } from './preview-modal.fixture';
import { SupportDialogFixturePage } from './support-dialog.fixture';
import { TutorialOverlayFixturePage } from './tutorial-overlay.fixture';
import { UpdateDialogFixturePage } from './update-dialog.fixture';
import { WorkspaceEmptyFixturePage } from './workspace-empty.fixture';
import { WorkspacePreviewFixturePage } from './workspace-preview.fixture';
import { WorkspaceShellFixturePage } from './workspace-shell.fixture';

function BrowserRuntimeAppPage() {
    return <AppShell />;
}

interface DevFixtureEntry extends DevFixtureContract {
    key: string;
    title: string;
    description: string;
    Component: ComponentType;
    runtime?: RuntimePorts;
}

function defineFixture(
    fixture: Omit<DevFixtureEntry, 'assertions' | 'limitations' | 'variants'> &
        Partial<Pick<DevFixtureEntry, 'assertions' | 'limitations' | 'variants'>>,
): DevFixtureEntry {
    return {
        assertions: [],
        limitations: [],
        variants: [],
        ...fixture,
    };
}

function fixtureContract(fixture: DevFixtureEntry): DevFixtureContract {
    const { key, title, description, kind, assertions, limitations, variants } = fixture;
    return { key, title, description, kind, assertions, limitations, variants };
}

const DEV_FIXTURES: DevFixtureEntry[] = [
    defineFixture({
        key: DEV_RUNTIME_APP_KEY,
        title: 'Runtime app',
        description:
            'Real app shell mounted on the browser-safe dev adapter, without the Tauri runtime.',
        kind: 'runtime',
        assertions: ['The task chooser exposes all three workflows.'],
        limitations: [
            'Native dialogs, export, drag-and-drop, and updater integration are simulated or unavailable.',
        ],
        Component: BrowserRuntimeAppPage,
    }),
    defineFixture({
        key: 'workflow-create-pdf',
        title: 'Workflow: Create a PDF',
        description: 'Deterministic populated Create a PDF workspace for agent verification.',
        kind: 'workflow',
        assertions: [
            'The source list contains a PDF and an image.',
            'The final document contains four ordered pages.',
            'Page selection, rotation, removal, preview, and output settings are interactive.',
        ],
        limitations: ['Export is intentionally a no-op in this isolated fixture.'],
        variants: [
            { label: 'PDF selected', href: '/?dev=workflow-create-pdf' },
            { label: 'Image selected', href: '/?dev=workflow-create-pdf&selected=image' },
            { label: 'Tutorial step 0', href: '/?dev=workflow-create-pdf&tutorialStep=0' },
        ],
        Component: WorkspacePreviewFixturePage,
    }),
    defineFixture({
        key: 'workflow-front-back',
        title: 'Workflow: Front/back documents',
        description: 'Deterministic populated A4 composition with interactive production controls.',
        kind: 'workflow',
        assertions: [
            'Both A4 regions contain an image in the populated state.',
            'Layout, format, preset, rotation, removal, restore, and swap controls update the DOM.',
            'The latest fixture action is exposed through data-fixture-last-action.',
        ],
        limitations: [
            'Preview geometry is browser-safe and does not validate native export geometry.',
        ],
        variants: [
            { label: 'Populated', href: '/?dev=workflow-front-back' },
            { label: 'Empty', href: '/?dev=workflow-front-back&state=empty' },
            { label: 'Horizontal', href: '/?dev=workflow-front-back&layout=horizontal' },
        ],
        Component: PageCompositionWorkflowFixturePage,
    }),
    defineFixture({
        key: 'workflow-compress-files',
        title: 'Workflow: Compress files',
        description:
            'Deterministic batch workspace with ready, running, completed, and issue states.',
        kind: 'workflow',
        assertions: [
            'Source rows and summary agree for the selected state.',
            'Settings, destination, remove, clear, restore, and compress controls update the DOM.',
            'The latest fixture action is exposed through data-fixture-last-action.',
        ],
        limitations: ['Compression results are fixture data and do not execute native codecs.'],
        variants: [
            { label: 'Completed', href: '/?dev=workflow-compress-files&state=completed' },
            { label: 'Ready', href: '/?dev=workflow-compress-files&state=ready' },
            { label: 'Running', href: '/?dev=workflow-compress-files&state=running' },
            { label: 'Issues', href: '/?dev=workflow-compress-files&state=issues' },
            { label: 'Empty', href: '/?dev=workflow-compress-files&state=empty' },
        ],
        Component: BatchCompressionWorkflowFixturePage,
    }),
    defineFixture({
        key: 'workspace-shell',
        title: 'Workspace shell',
        description: 'Technical browser-safe workspace baseline with sample sources.',
        kind: 'component',
        assertions: ['Five sample sources are visible and no source is selected initially.'],
        limitations: ['Source metadata is representative fixture data.'],
        Component: WorkspaceShellFixturePage,
    }),
    defineFixture({
        key: 'workspace-preview',
        title: 'Workspace preview',
        description:
            'Realistic working session with mixed PDF/image content. Add &selected=image for the image picker.',
        kind: 'component',
        assertions: [
            'A PDF or image source is selected according to the selected query parameter.',
            'Four pages are present in the final document.',
        ],
        limitations: ['Add files and export actions are intentionally no-ops.'],
        variants: [
            { label: 'PDF selected', href: '/?dev=workspace-preview' },
            { label: 'Image selected', href: '/?dev=workspace-preview&selected=image' },
        ],
        Component: WorkspacePreviewFixturePage,
    }),
    defineFixture({
        key: 'workspace-empty',
        title: 'Workspace empty',
        description: 'Empty-state workspace fixture.',
        kind: 'component',
        assertions: ['The workspace shows the file drop and Add files empty state.'],
        limitations: ['Adding files is intentionally a no-op.'],
        Component: WorkspaceEmptyFixturePage,
    }),
    defineFixture({
        key: 'preview-modal',
        title: 'Preview modal',
        description: 'Browser-safe preview modal. Add &pages=1 for the single-page variant.',
        kind: 'component',
        assertions: ['The modal renders the requested number of real PDF pages.'],
        limitations: ['Closing the isolated modal is intentionally a no-op.'],
        variants: [
            { label: 'Three pages', href: '/?dev=preview-modal' },
            { label: 'Single page', href: '/?dev=preview-modal&pages=1' },
        ],
        Component: PreviewModalFixturePage,
    }),
    defineFixture({
        key: 'support-dialog',
        title: 'Support dialog',
        description: 'Support/diagnostics dialog fixture.',
        kind: 'component',
        assertions: ['Diagnostics, copy, save, and GitHub issue controls are visible.'],
        limitations: ['Support actions do not access the clipboard, filesystem, or browser tabs.'],
        Component: SupportDialogFixturePage,
    }),
    defineFixture({
        key: 'tutorial-overlay',
        title: 'Tutorial overlay',
        description: 'Tutorial overlay fixture. Add &step=0..6 to inspect targets.',
        kind: 'component',
        assertions: ['The requested tutorial step highlights its matching fixture target.'],
        limitations: ['Next, skip, and complete callbacks are intentionally no-ops.'],
        variants: Array.from({ length: 7 }, (_, step) => ({
            label: `Step ${step}`,
            href: `/?dev=tutorial-overlay&step=${step}`,
        })),
        Component: TutorialOverlayFixturePage,
    }),
    defineFixture({
        key: 'feedback-overlays',
        title: 'Feedback overlays',
        description:
            'Progress and toast overlays. Add &view=progress | progress-indeterminate | toast-success | toast-warning.',
        kind: 'component',
        assertions: ['The requested progress or toast overlay is visible.'],
        limitations: ['Overlay timing is fixed fixture state, not a native operation.'],
        variants: [
            { label: 'Progress', href: '/?dev=feedback-overlays&view=progress' },
            {
                label: 'Indeterminate',
                href: '/?dev=feedback-overlays&view=progress-indeterminate',
            },
            { label: 'Success toast', href: '/?dev=feedback-overlays&view=toast-success' },
            { label: 'Warning toast', href: '/?dev=feedback-overlays&view=toast-warning' },
        ],
        Component: FeedbackOverlaysFixturePage,
    }),
    defineFixture({
        key: 'final-document',
        title: 'Final document',
        description: 'Populated final-document list fixture. Add &count=1..500 for stress testing.',
        kind: 'component',
        assertions: ['The list contains the requested page count and supports local page actions.'],
        limitations: ['The stress variant reuses one image asset with deterministic identifiers.'],
        variants: [
            { label: 'Default', href: '/?dev=final-document' },
            { label: 'One page', href: '/?dev=final-document&count=1' },
            { label: '500 pages', href: '/?dev=final-document&count=500' },
        ],
        Component: FinalDocumentFixturePage,
    }),
    defineFixture({
        key: 'page-picker',
        title: 'Page picker',
        description: 'PDF page-picker fixture. Add &mode=image for the image panel.',
        kind: 'component',
        assertions: ['The requested PDF or image picker supports local selection and rotation.'],
        limitations: ['Source changes remain inside the fixture state.'],
        variants: [
            { label: 'PDF', href: '/?dev=page-picker' },
            { label: 'Image', href: '/?dev=page-picker&mode=image' },
        ],
        Component: PagePickerFixturePage,
    }),
    defineFixture({
        key: 'update-dialog',
        title: 'Update dialog',
        description:
            'Update dialog fixture. Add &view=installing or &view=error for alternate states.',
        kind: 'component',
        assertions: ['The requested available, installing, or error dialog state is visible.'],
        limitations: ['Install and dismiss callbacks are intentionally no-ops.'],
        variants: [
            { label: 'Available', href: '/?dev=update-dialog' },
            { label: 'Installing', href: '/?dev=update-dialog&view=installing' },
            { label: 'Error', href: '/?dev=update-dialog&view=error' },
        ],
        Component: UpdateDialogFixturePage,
    }),
    defineFixture({
        key: 'error-boundary',
        title: 'Error boundary',
        description:
            'App error-boundary fallback fixture. Add &message=... to override the crash text.',
        kind: 'component',
        assertions: ['The application error boundary renders its recovery surface.'],
        limitations: ['A React development console error is expected for this route.'],
        Component: ErrorBoundaryFixturePage,
    }),
];

const INDEX_CONTRACT: DevFixtureContract = {
    key: DEV_FIXTURE_INDEX_KEY,
    title: 'Fixture index',
    description: 'Catalog of browser-safe verification surfaces for developers and LLM agents.',
    kind: 'index',
    assertions: ['Every registered fixture exposes a direct route and machine-readable contract.'],
    limitations: [],
    variants: DEV_FIXTURES.map((fixture) => ({
        label: fixture.title,
        href: getDevFixtureHref(fixture.key),
    })),
};

function DevIndexPage() {
    return (
        <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Dev Fixtures
                    </p>
                    <h1 className="text-3xl font-semibold">Fixture index</h1>
                    <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Browser-safe verification surfaces for developers and LLM agents. Every
                        route publishes its contract through
                        <code className="mx-1 rounded bg-ui-accent-soft px-1.5 py-0.5 text-xs">
                            window.__FYLER_DEV_FIXTURE__
                        </code>
                        and marks the document as ready. Use
                        <code className="mx-1 rounded bg-ui-accent-soft px-1.5 py-0.5 text-xs">
                            {DEV_RUNTIME_APP_KEY}
                        </code>
                        for browser-safe integration, or the workflow routes for deterministic
                        checks.
                    </p>
                </div>

                <div className="rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-sm">
                    <ul className="space-y-3">
                        {DEV_FIXTURES.map((fixture) => (
                            <li
                                key={fixture.key}
                                data-fixture-entry={fixture.key}
                                className="flex flex-col gap-2 rounded-lg border border-ui-border bg-ui-surface-subtle px-3 py-2.5"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="text-sm font-medium text-ui-text">
                                            {fixture.title}
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <span className="rounded-full bg-ui-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ui-text-muted">
                                                {fixture.kind}
                                            </span>
                                            <code className="shrink-0 text-xs text-ui-text-muted">
                                                {fixture.key}
                                            </code>
                                        </span>
                                    </div>
                                    <span className="text-xs leading-5 text-ui-text-secondary">
                                        {fixture.description}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(fixture.variants.length > 0
                                        ? fixture.variants
                                        : [
                                              {
                                                  label: 'Open',
                                                  href: getDevFixtureHref(fixture.key),
                                              },
                                          ]
                                    ).map((variant) => (
                                        <a
                                            key={variant.href}
                                            href={variant.href}
                                            className="rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-xs font-medium text-ui-text-secondary hover:bg-ui-surface-hover hover:text-ui-text"
                                        >
                                            {variant.label}
                                        </a>
                                    ))}
                                </div>
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
    const view =
        !fixtureKey || fixtureKey === DEV_FIXTURE_INDEX_KEY ? (
            <DevIndexPage />
        ) : fixture ? (
            <fixture.Component />
        ) : (
            <UnknownFixturePage fixtureKey={fixtureKey} />
        );
    const contract: DevFixtureContract = fixture
        ? fixtureContract(fixture)
        : !fixtureKey || fixtureKey === DEV_FIXTURE_INDEX_KEY
          ? INDEX_CONTRACT
          : {
                key: fixtureKey,
                title: 'Unknown fixture',
                description: 'The requested fixture is not registered.',
                kind: 'component',
                assertions: ['The unknown-fixture fallback is visible.'],
                limitations: ['No verification surface exists for this key.'],
                variants: [
                    {
                        label: 'Fixture index',
                        href: getDevFixtureHref(DEV_FIXTURE_INDEX_KEY),
                    },
                ],
            };

    return (
        <AppProviders runtime={fixture?.runtime ?? browserRuntimePorts}>
            <DevModeShell
                minWidth={NORMAL_APP_WINDOW_MIN_SIZE.width}
                minHeight={NORMAL_APP_WINDOW_MIN_SIZE.height}
                contract={contract}
            >
                {view}
            </DevModeShell>
        </AppProviders>
    );
}
