import { useCallback, useRef, useState } from 'react';

import type { ApplicationWindowPort } from '@/capabilities/application-window';

type AlwaysOnTopPort = Pick<ApplicationWindowPort, 'setAlwaysOnTop'>;

type AlwaysOnTopControllerOptions = {
    applicationWindow: AlwaysOnTopPort;
    onApplied: (value: boolean) => void;
    onPendingChange: (pending: boolean) => void;
    onError: (error: unknown) => void;
};

export function createAlwaysOnTopController({
    applicationWindow,
    onApplied,
    onPendingChange,
    onError,
}: AlwaysOnTopControllerOptions) {
    let appliedValue = false;
    let pendingChanges = 0;
    let transitionQueue: Promise<void> = Promise.resolve();

    const change = (nextValue: boolean): Promise<boolean> => {
        pendingChanges += 1;
        if (pendingChanges === 1) onPendingChange(true);

        const result = transitionQueue.then(async () => {
            if (nextValue === appliedValue) return true;

            try {
                await applicationWindow.setAlwaysOnTop(nextValue);
                appliedValue = nextValue;
                onApplied(nextValue);
                return true;
            } catch (error) {
                onError(error);
                return false;
            }
        });

        transitionQueue = result.then(
            () => undefined,
            () => undefined,
        );

        return result.finally(() => {
            pendingChanges -= 1;
            if (pendingChanges === 0) onPendingChange(false);
        });
    };

    return { change };
}

export function useAlwaysOnTop(
    applicationWindow: AlwaysOnTopPort,
    onError: (error: unknown) => void,
) {
    const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
    const [isChangingAlwaysOnTop, setIsChangingAlwaysOnTop] = useState(false);
    const applicationWindowRef = useRef(applicationWindow);
    const onErrorRef = useRef(onError);
    applicationWindowRef.current = applicationWindow;
    onErrorRef.current = onError;

    const controllerRef = useRef<ReturnType<typeof createAlwaysOnTopController> | null>(null);
    if (controllerRef.current === null) {
        controllerRef.current = createAlwaysOnTopController({
            applicationWindow: {
                setAlwaysOnTop: (value) => applicationWindowRef.current.setAlwaysOnTop(value),
            },
            onApplied: setIsAlwaysOnTop,
            onPendingChange: setIsChangingAlwaysOnTop,
            onError: (error) => onErrorRef.current(error),
        });
    }
    const controller = controllerRef.current;

    const toggle = useCallback(() => {
        void controller.change(!isAlwaysOnTop);
    }, [controller, isAlwaysOnTop]);
    const disable = useCallback(() => controller.change(false), [controller]);

    return { isAlwaysOnTop, isChangingAlwaysOnTop, toggle, disable };
}
