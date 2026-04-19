import type { ReactNode } from 'react';

interface Props {
    as?: 'div' | 'section' | 'details';
    tone?: 'subtle' | 'raised';
    title?: ReactNode;
    header?: ReactNode;
    className?: string;
    titleClassName?: string;
    children: ReactNode;
}

export function PanelSurface({
    as: Tag = 'section',
    tone = 'subtle',
    title,
    header,
    className = '',
    titleClassName = '',
    children,
}: Props) {
    const surfaceToneClass = tone === 'raised' ? 'panel-surface-raised' : 'panel-surface-subtle';
    const headerContent =
        header ??
        (title != null ? (
            <h3 className={['panel-title', titleClassName].filter(Boolean).join(' ')}>{title}</h3>
        ) : null);

    return (
        <Tag className={['panel-surface', surfaceToneClass, className].filter(Boolean).join(' ')}>
            {headerContent}
            {children}
        </Tag>
    );
}
