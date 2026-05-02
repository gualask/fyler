import type { ReactNode } from 'react';

interface Props {
    title: ReactNode | null;
    children?: ReactNode;
    className?: string;
    toolbarClassName?: string;
}

export function SectionHeader({ title, children, className = '', toolbarClassName = '' }: Props) {
    return (
        <div className={['section-header', className].filter(Boolean).join(' ')}>
            {title === null ? <div /> : <h2 className="section-header-title">{title}</h2>}
            <div className={['section-toolbar', toolbarClassName].filter(Boolean).join(' ')}>
                {children}
            </div>
        </div>
    );
}
