import { IconLock } from '@tabler/icons-react';

type Props = {
    titleId: string;
    descriptionId: string;
    title: string;
    body: string;
    counter: string;
};

export function DialogHeader({ titleId, descriptionId, title, body, counter }: Props) {
    return (
        <div className="border-b border-ui-border px-6 py-5">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ui-accent-soft text-ui-accent-on-soft">
                    <IconLock className="h-5 w-5" stroke={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id={titleId} className="text-lg font-semibold text-ui-text">
                            {title}
                        </h2>
                        <span className="shrink-0 rounded-full bg-ui-surface-hover px-2 py-1 text-xs font-semibold text-ui-text-muted">
                            {counter}
                        </span>
                    </div>
                    <p id={descriptionId} className="mt-1 text-sm text-ui-text-muted">
                        {body}
                    </p>
                </div>
            </div>
        </div>
    );
}
