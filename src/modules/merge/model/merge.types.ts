import type { BasicCompressionPreset } from '@/capabilities/compression-profiles';
import type { QuarterTurn } from '@/shared/domain';

/** A page or image selected for merge export. */
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

/** Per-source edits applied by the merge workflow. */
export type FileEdits = {
    revision: number;
    pageRotations?: Record<number, QuarterTurn>;
    imageRotation?: QuarterTurn;
};

export type ExportItem =
    | { kind: 'pdf'; fileId: string; pageNum: number }
    | { kind: 'image'; fileId: string };

export type ImageFit = 'fit' | 'contain' | 'cover';

export type OptimizeOptions = {
    preset?: BasicCompressionPreset;
    jpegQuality?: number;
    targetDpi?: number;
};

export type MergeRequest = {
    pages: ExportItem[];
    edits: Record<string, FileEdits>;
    outputPath: string;
    imageFit: ImageFit;
    optimize?: OptimizeOptions;
};

export type MergeResult = {
    optimizationFailedCount: number;
};
