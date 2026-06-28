export type PagePickerFixtureMode = 'pdf' | 'image';

export function getPagePickerFixtureMode(search: string): PagePickerFixtureMode {
    return new URLSearchParams(search).get('mode') === 'image' ? 'image' : 'pdf';
}
