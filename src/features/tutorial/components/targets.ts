export const TUTORIAL_TARGETS = {
    fileList: 'file-list',
    pagePicker: 'page-picker',
    finalDocument: 'final-document',
    export: 'export',
} as const;

export type TutorialTarget = (typeof TUTORIAL_TARGETS)[keyof typeof TUTORIAL_TARGETS];

export const TUTORIAL_DATA_ATTR = 'data-tutorial' as const;

export function tutorialTargetProps(target: TutorialTarget): { 'data-tutorial': TutorialTarget } {
    return { 'data-tutorial': target };
}
