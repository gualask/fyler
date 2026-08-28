import type { SourceFile } from '@/capabilities/document-sources';
import type { FileEdits, FinalPage } from '@/modules/merge/model';

/** View-model used by the Final Document list. */
export interface ListItem {
    page: FinalPage;
    file: SourceFile | undefined;
    edits: FileEdits;
    index: number;
    isSelected: boolean;
}
