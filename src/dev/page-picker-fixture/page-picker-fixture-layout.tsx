import type { ReactNode } from 'react';

export function PagePickerFixtureLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-ui-bg p-6 text-ui-text">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                <div className="rounded-3xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Page Picker Fixture
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold">Page picker preview</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Use `?dev=page-picker` for the PDF panel or `?dev=page-picker&mode=image`
                        for the image panel.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <a href="/?dev=page-picker" className="btn-ghost">
                            PDF mode
                        </a>
                        <a href="/?dev=page-picker&amp;mode=image" className="btn-ghost">
                            Image mode
                        </a>
                    </div>
                </div>

                <div className="h-[78vh] overflow-hidden rounded-3xl border border-ui-border bg-ui-surface shadow-sm">
                    {children}
                </div>
            </div>
        </div>
    );
}
