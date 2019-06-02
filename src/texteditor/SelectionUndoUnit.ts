namespace Textor {

    export class SelectionUndoUnit implements IUndoUnit {

        private _textModel: TextModel;
        private _undoTextRange: TextRange;
        private _redoTextRange: TextRange;

        constructor(textModel: TextModel, textRange: TextRange) {
            this._textModel = textModel;
            this._redoTextRange = textRange;
            this._undoTextRange = this._textModel.getTextRange();
        }

        public undo() {
            this._textModel.selectRange(this._undoTextRange);
        }

        public redo() {
            this._textModel.selectRange(this._redoTextRange);
        }

        public get isEmpty(): boolean {
            return false;
        }

        public merge(undoUnit): boolean {
            if (undoUnit instanceof SelectionUndoUnit) {
                const selectionUndoUnit: SelectionUndoUnit = undoUnit;
                this._redoTextRange = selectionUndoUnit.redoTextRange;
                return true;
            }
            return false;
        }

        public toString(): string {
            return "Selection: " + this._redoTextRange.toString() + " => " + this._undoTextRange.toString();
        }

        public get redoTextRange(): TextRange {
            return this._redoTextRange;
        }
    }
}
