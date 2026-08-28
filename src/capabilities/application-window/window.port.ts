import { createContext, createElement, type ReactNode, useContext } from 'react';

type ApplicationWindowSize = { width: number; height: number };

export const NORMAL_APP_WINDOW_MIN_SIZE = { width: 1100, height: 700 } as const;

export interface ApplicationWindowPort {
    getLogicalSize(): Promise<ApplicationWindowSize>;
    setSize(width: number, height: number): Promise<void>;
    setAlwaysOnTop(flag: boolean): Promise<void>;
    setMinSize(width: number, height: number): Promise<void>;
}

const ApplicationWindowPortContext = createContext<ApplicationWindowPort | null>(null);

export function ApplicationWindowProvider({
    value,
    children,
}: {
    value: ApplicationWindowPort;
    children: ReactNode;
}) {
    return createElement(ApplicationWindowPortContext.Provider, { value }, children);
}

export function useApplicationWindowPort(): ApplicationWindowPort {
    const port = useContext(ApplicationWindowPortContext);
    if (!port) {
        throw new Error('useApplicationWindowPort must be used within ApplicationWindowProvider');
    }
    return port;
}
