/** Source document kind supported by the app. */
type DocumentSourceKind = 'pdf' | 'image';

/** A specific thing within a source that the merge workflow can target. */
export type SourceTarget = { kind: 'pdf'; pageNum: number } | { kind: 'image' };

/** A user-imported source tracked by a workflow session. */
export type SourceFile = {
    id: string;
    originalPath: string;
    name: string;
    /** Original file size in bytes. */
    byteSize: number;
    /** Null while a PDF page count is still being resolved. */
    pageCount: number | null;
    kind: DocumentSourceKind;
};

export type SkippedFileReason = 'unsupported_format' | 'read_error' | 'path_error';

export type SkippedFile = {
    name: string;
    reason: SkippedFileReason;
    detail?: string;
};

export type PasswordProtectedFile = {
    originalPath: string;
    name: string;
    byteSize: number;
};

export type OpenFilesResult = {
    files: SourceFile[];
    passwordRequired: PasswordProtectedFile[];
    skippedErrors: SkippedFile[];
};
