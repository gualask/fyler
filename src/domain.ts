export type DocKind = 'pdf' | 'image';

export type Doc = {
    id: string;
    path: string;
    name: string;
    pageCount: number;
    pageSpec: string;
    kind: DocKind;
};

export type MergeInput = {
    path: string;
    pageSpec: string;
};

export type MergeRequest = {
    inputs: MergeInput[];
    outputPath: string;
};
