export const TUTORIAL_TARGETS = {
    fileList: 'file-list',
    pagePicker: 'page-picker',
    finalDocument: 'final-document',
    export: 'export',
} as const;

export type TutorialTarget = typeof TUTORIAL_TARGETS[keyof typeof TUTORIAL_TARGETS];

