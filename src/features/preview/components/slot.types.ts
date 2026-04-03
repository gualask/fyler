import type { FileEdits, FinalPage, ImageFit, SourceFile } from '@/shared/domain';

/** Derived view-model types used by the preview slot rendering pipeline. */
export interface SlotPage {
    fp: FinalPage;
    file: SourceFile | undefined;
    edits: FileEdits;
    index: number;
}

export interface SlotContext {
    scrollRoot: HTMLElement | null;
    zoomLevel: number;
    imageFit: ImageFit;
    matchExportedImages: boolean;
    onVisible: (index: number) => void;
}
