import type { SourceFile } from '@/capabilities/document-sources';
import type { FileEdits, FinalPage, ImageFit } from '@/modules/merge/model';

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
