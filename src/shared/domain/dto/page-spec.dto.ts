export type PageSpecError =
    | { kind: 'empty-token' }
    | { kind: 'invalid-token'; token: string }
    | { kind: 'non-positive-page' }
    | { kind: 'reversed-range'; start: number; end: number }
    | { kind: 'out-of-range'; page: number; total: number };
