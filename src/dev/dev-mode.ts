export const DEV_FIXTURE_INDEX_KEY = 'fixtures';
export const DEV_RUNTIME_APP_KEY = 'runtime-app';

export function getDevFixtureKey(search: string): string | null {
    const params = new URLSearchParams(search);
    const key = params.get('dev')?.trim();

    return key ? key : null;
}

export function getDevFixtureHref(key: string, pathname = '/'): string {
    return `${pathname}?dev=${encodeURIComponent(key)}`;
}
