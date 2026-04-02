import type { ReactNode } from 'react';

interface Props {
    title: ReactNode;
    children?: ReactNode;
    toolbarClassName?: string;
}

export function ColumnHeader({ title, children, toolbarClassName = '' }: Props) {
    return (
        <div className="column-header">
            <h2 className="column-header-title">{title}</h2>
            <div className={['column-toolbar', toolbarClassName].filter(Boolean).join(' ')}>
                {children}
            </div>
        </div>
    );
}
