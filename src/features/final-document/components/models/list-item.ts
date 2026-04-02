import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';

export interface ListItem {
    page: FinalPage;
    file: SourceFile | undefined;
    edits: FileEdits;
    index: number;
    isSelected: boolean;
}
