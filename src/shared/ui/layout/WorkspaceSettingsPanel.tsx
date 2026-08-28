import type { ReactNode } from 'react';

import { SectionHeader } from './SectionHeader';

export function WorkspaceSettingsPanel({
    title,
    titleId,
    children,
}: {
    title: ReactNode;
    titleId: string;
    children: ReactNode;
}) {
    return (
        <aside
            className="workspace-surface flex w-80 shrink-0 flex-col bg-ui-surface"
            aria-labelledby={titleId}
        >
            <SectionHeader title={title} titleId={titleId} className="border-b border-ui-border" />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </aside>
    );
}
