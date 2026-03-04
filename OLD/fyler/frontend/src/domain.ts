export type Doc = {
    id: string;
    path: string;
    name: string;
    pageCount: number;
    pageSpec: string;
};

export type MergeInput = {
    path: string;
    pageSpec: string;
};

export type MergeRequest = {
    inputs: MergeInput[];
    outputPath: string;
};

