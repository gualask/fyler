import {
    type ApplicationWindowPort,
    NORMAL_APP_WINDOW_MIN_SIZE,
} from '@/capabilities/application-window';

export type AppWindowProfile = 'home' | 'merge' | 'page-composition' | 'batch-compression';

type WindowGeometry = {
    size: { width: number; height: number };
    minSize: { width: number; height: number };
};

const NORMAL_WINDOW_GEOMETRY = {
    size: { width: 1100, height: 700 },
    minSize: NORMAL_APP_WINDOW_MIN_SIZE,
} as const;

const APP_WINDOW_PROFILES = {
    home: NORMAL_WINDOW_GEOMETRY,
    merge: NORMAL_WINDOW_GEOMETRY,
    'batch-compression': NORMAL_WINDOW_GEOMETRY,
    'page-composition': NORMAL_WINDOW_GEOMETRY,
} as const satisfies Record<AppWindowProfile, WindowGeometry>;

export async function applyAppWindowProfile(
    applicationWindow: ApplicationWindowPort,
    profileName: AppWindowProfile,
    isActive: () => boolean,
): Promise<void> {
    const profile = APP_WINDOW_PROFILES[profileName];
    await applicationWindow.setMinSize(profile.minSize.width, profile.minSize.height);
    if (!isActive()) return;

    await applicationWindow.setSize(profile.size.width, profile.size.height);
}
