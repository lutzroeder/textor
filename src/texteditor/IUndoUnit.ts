namespace Textor {

    export interface IUndoUnit {
        isEmpty: boolean;
        undo(): void;
        redo(): void;
        merge(undoUnit: IUndoUnit): boolean;
    }
}
