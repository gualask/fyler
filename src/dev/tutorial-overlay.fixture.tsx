import { TUTORIAL_TARGETS, TutorialOverlay, tutorialTargetProps } from '@/features/tutorial';

const TOTAL_STEPS = 7;

function getCurrentStep(search: string): number {
    const raw = new URLSearchParams(search).get('step');
    const parsed = raw ? Number(raw) : 0;

    if (!Number.isInteger(parsed)) {
        return 0;
    }

    return Math.min(Math.max(parsed, 0), TOTAL_STEPS - 1);
}

function FixturePanel({
    title,
    description,
    tutorialTarget,
}: {
    title: string;
    description: string;
    tutorialTarget: (typeof TUTORIAL_TARGETS)[keyof typeof TUTORIAL_TARGETS];
}) {
    return (
        <section
            {...tutorialTargetProps(tutorialTarget)}
            className="rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-sm"
        >
            <h2 className="text-base font-semibold text-ui-text">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-ui-text-secondary">{description}</p>
        </section>
    );
}

export function TutorialOverlayFixturePage() {
    const currentStep = getCurrentStep(window.location.search);

    return (
        <>
            <div className="min-h-screen bg-ui-bg px-6 py-8 text-ui-text">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                    <div className="rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                            Tutorial Fixture
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold">Tutorial overlay preview</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-ui-text-secondary">
                            Use the `step` query param from `0` to `{TOTAL_STEPS - 1}` to inspect
                            each spotlight target in browser-safe mode.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <FixturePanel
                            title="File list"
                            description="Fixture target for the source file list tutorial step."
                            tutorialTarget={TUTORIAL_TARGETS.fileList}
                        />
                        <FixturePanel
                            title="Page picker"
                            description="Fixture target for the page picker tutorial step."
                            tutorialTarget={TUTORIAL_TARGETS.pagePicker}
                        />
                        <FixturePanel
                            title="Final document"
                            description="Fixture target for the final document tutorial step."
                            tutorialTarget={TUTORIAL_TARGETS.finalDocument}
                        />
                        <FixturePanel
                            title="Preview and export"
                            description="Fixture target for the review/export tutorial step."
                            tutorialTarget={TUTORIAL_TARGETS.export}
                        />
                        <FixturePanel
                            title="Optimization footer"
                            description="Fixture target for the optional output settings tutorial step."
                            tutorialTarget={TUTORIAL_TARGETS.outputPanel}
                        />
                        <FixturePanel
                            title="Quick Add"
                            description="Fixture target for the optional Quick Add tutorial step."
                            tutorialTarget={TUTORIAL_TARGETS.quickAdd}
                        />
                        <FixturePanel
                            title="Settings"
                            description="Fixture target for the optional settings tutorial step."
                            tutorialTarget={TUTORIAL_TARGETS.settings}
                        />
                    </div>
                </div>
            </div>

            <TutorialOverlay
                currentStep={currentStep}
                onNext={() => undefined}
                onSkip={() => undefined}
                onComplete={() => undefined}
            />
        </>
    );
}
