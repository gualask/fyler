import type { TutorialTarget } from './targets';

export const TUTORIAL_DATA_ATTR = 'data-tutorial' as const;

export function tutorialTargetProps(target: TutorialTarget): { 'data-tutorial': TutorialTarget } {
    return { 'data-tutorial': target };
}

