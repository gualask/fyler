export function getTutorialStep(search: string): number | null {
    const raw = new URLSearchParams(search).get('tutorialStep');
    if (raw === null) return null;

    const parsed = Number(raw);
    return Number.isInteger(parsed) ? Math.max(0, parsed) : null;
}
