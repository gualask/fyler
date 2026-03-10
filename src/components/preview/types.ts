import type { FileEdits, FinalPage, ImageFit, SourceFile } from '../../domain';
import type { RotationDirection } from '../../fileEdits';

export type PageIndicator = {
    current?: number;
    total?: number;
    mode?: 'index' | 'page-num';
};

export type MoveControl = {
    currentPosition: number;
    totalPositions: number;
    onMoveToPosition: (targetIndex: number) => void;
};

export interface PreviewModalProps {
    finalPages: FinalPage[];
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
    imageFit?: ImageFit;
    matchExportedImages?: boolean;
    indicator?: PageIndicator;
    moveControl?: MoveControl;
    onRotatePage?: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    onClose: () => void;
}
