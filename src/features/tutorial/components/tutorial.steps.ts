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
    { target: TUTORIAL_TARGETS.outputPanel, i18nKey: 'tutorial.step5' },
    { target: TUTORIAL_TARGETS.quickAdd, i18nKey: 'tutorial.step6' },
    { target: TUTORIAL_TARGETS.settings, i18nKey: 'tutorial.step7' },
];

export const TUTORIAL_ESSENTIAL_STEP_COUNT = 4;
export const TUTORIAL_EXTRA_STEP_COUNT = TUTORIAL_STEPS.length - TUTORIAL_ESSENTIAL_STEP_COUNT;
