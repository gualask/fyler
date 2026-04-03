import type { TranslationKey } from '@/shared/i18n';
import { TUTORIAL_TARGETS, type TutorialTarget } from './tutorial.targets';

export interface TutorialStep {
    target: TutorialTarget;
    i18nKey: TranslationKey;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    { target: TUTORIAL_TARGETS.fileList, i18nKey: 'tutorial.step1' },
    { target: TUTORIAL_TARGETS.pagePicker, i18nKey: 'tutorial.step2' },
    { target: TUTORIAL_TARGETS.finalDocument, i18nKey: 'tutorial.step3' },
    { target: TUTORIAL_TARGETS.export, i18nKey: 'tutorial.step4' },
];
