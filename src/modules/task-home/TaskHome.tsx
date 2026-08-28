import { IconChevronRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from '@/shared/i18n';
import { TaskResultPreview } from './TaskResultPreview';

function QuickTool({
    preview,
    title,
    description,
    onOpen,
    unavailableLabel,
}: {
    preview: ReactNode;
    title: string;
    description: string;
    onOpen?: () => void;
    unavailableLabel: string;
}) {
    const isUnavailable = !onOpen;

    return (
        <button
            type="button"
            onClick={onOpen}
            disabled={isUnavailable}
            className="group grid h-32 w-full grid-cols-[minmax(0,1fr)_260px_auto] items-center gap-x-5 rounded-xl border border-ui-border bg-ui-surface px-5 py-4 text-left transition-[background-color,border-color] hover:border-ui-border-hover hover:bg-ui-surface-hover active:bg-ui-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-muted disabled:cursor-default disabled:opacity-70 disabled:hover:border-ui-border disabled:hover:bg-ui-surface disabled:active:bg-ui-surface"
        >
            <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-ui-text">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-ui-text-dim">{description}</span>
            </span>
            {preview}
            {isUnavailable ? (
                <span className="shrink-0 rounded-full bg-ui-surface-hover px-3 py-1 text-xs font-semibold text-ui-text-muted">
                    {unavailableLabel}
                </span>
            ) : (
                <IconChevronRight
                    className="h-5 w-5 shrink-0 text-ui-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ui-accent-text"
                    aria-hidden="true"
                />
            )}
        </button>
    );
}

export function TaskHome({
    onOpenMerge,
    onOpenPageComposition,
    onOpenBatchCompression,
    renderSettingsMenu,
}: {
    onOpenMerge: () => void;
    onOpenPageComposition: () => void;
    onOpenBatchCompression: () => void;
    renderSettingsMenu: () => ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <main className="flex h-screen flex-col overflow-auto bg-ui-bg text-ui-text">
            <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <img src="/icon.svg" alt="Fyler" className="h-6 w-6" />
                        <span className="text-base font-bold text-ui-text">Fyler</span>
                    </div>
                    <div className="mx-1 h-5 w-px bg-ui-border" />
                    {renderSettingsMenu()}
                </div>
            </header>
            <section className="mx-auto grid w-full max-w-4xl flex-1 grid-rows-[1fr_auto_1fr] px-6 py-10">
                <div className="mb-8 max-w-2xl self-end">
                    <h1 className="text-3xl font-bold tracking-[-0.025em] text-ui-text">
                        {t('taskHome.title')}
                    </h1>
                </div>
                <div className="flex flex-col gap-3">
                    <QuickTool
                        preview={<TaskResultPreview kind="merge" />}
                        title={t('taskHome.merge.title')}
                        description={t('taskHome.merge.description')}
                        onOpen={onOpenMerge}
                        unavailableLabel={t('taskHome.comingSoon')}
                    />
                    <QuickTool
                        preview={<TaskResultPreview kind="composition" />}
                        title={t('taskHome.composition.title')}
                        description={t('taskHome.composition.description')}
                        onOpen={onOpenPageComposition}
                        unavailableLabel={t('taskHome.comingSoon')}
                    />
                    <QuickTool
                        preview={<TaskResultPreview kind="compression" />}
                        title={t('taskHome.compression.title')}
                        description={t('taskHome.compression.description')}
                        onOpen={onOpenBatchCompression}
                        unavailableLabel={t('taskHome.comingSoon')}
                    />
                </div>
            </section>
        </main>
    );
}
