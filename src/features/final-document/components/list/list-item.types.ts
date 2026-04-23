import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';

/** View-model used by the Final Document list. */
export interface ListItem {
    page: FinalPage;
    file: SourceFile | undefined;
    edits: FileEdits;
    index: number;
    isSelected: boolean;
}
