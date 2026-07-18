/** Source document kind supported by the app. */
type DocKind = 'pdf' | 'image';

/** A specific “thing” within a source file that the user can target (focus/rotate/export). */
export type SourceTarget = { kind: 'pdf'; pageNum: number } | { kind: 'image' };

/**
 * Rotation expressed in 90° steps.
 *
 * `0 => 0°`, `1 => 90°`, `2 => 180°`, `3 => 270°`.
 */
export type QuarterTurn = 0 | 1 | 2 | 3;

/** Clockwise/counterclockwise 90° step direction. */
export type RotationDirection = 'cw' | 'ccw';

/**
 * A user-imported file tracked by the session.
 *
 * `pageCount` is 1-based and represents the original source; edits are tracked separately.
 * For PDFs, `pageCount` is usually known at import time; `null` means the count is unavailable.
 */
export type SourceFile = {
    id: string;
    originalPath: string;
    name: string;
    /** Original file size in bytes. */
    byteSize: number;
    /** Null when a PDF page count is not available yet. */
    pageCount: number | null;
    kind: DocKind;
};

/**
 * A page in the final composition.
 *
 * `pageNum` is 1-based and refers to the original page number in the source file.
 */
export type FinalPage =
    | {
          id: string;
          fileId: string;
          kind: 'pdf';
          pageNum: number;
      }
    | {
          id: string;
          fileId: string;
          kind: 'image';
      };

/**
 * Per-source edits applied by the user.
 *
 * - `pageRotations` is sparse: missing pages are treated as `0` rotation.
 * - `revision` is incremented on every edit to make cache invalidation cheap.
 */
export type FileEdits = {
    revision: number;
    pageRotations?: Record<number, QuarterTurn>;
    imageRotation?: QuarterTurn;
};

export type ExportItem =
    | { kind: 'pdf'; fileId: string; pageNum: number }
    | { kind: 'image'; fileId: string };

type JpegQuality = number;
export type ImageFit = 'fit' | 'contain' | 'cover';

export type OptimizeOptions = {
    jpegQuality?: JpegQuality;
    targetDpi?: number;
    imageFit?: ImageFit;
};

export type ImageExportPreviewLayout = {
    pageWidthPt: number;
    pageHeightPt: number;
    drawXPt: number;
    drawYPt: number;
    drawWidthPt: number;
    drawHeightPt: number;
    clipToPage: boolean;
    fillBackground: boolean;
};

export type MergeRequest = {
    pages: ExportItem[];
    edits: Record<string, FileEdits>;
    outputPath: string;
    optimize?: OptimizeOptions;
};

export type MergeResult = {
    optimizationFailedCount: number;
    warnings?: MergeWarning[];
};

type MergeWarning = {
    code: string;
    meta?: Record<string, unknown>;
};

type SkippedFile = {
    name: string;
    reason: string;
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
