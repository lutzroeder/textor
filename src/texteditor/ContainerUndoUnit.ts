namespace Textor {

    export class ContainerUndoUnit {

        private _undoUnits: IUndoUnit[] = [];

        public add(undoUnit: IUndoUnit) {
            this._undoUnits.push(undoUnit);
        }

        public undo() {
            for (const undoUnit of this._undoUnits) {
                undoUnit.undo();
            }
        }

        public redo() {
            for (const undoUnit of this._undoUnits) {
                undoUnit.redo();
            }
        }

        public get isEmpty(): boolean {
            return this._undoUnits.length > 0 && this._undoUnits.every((undoUnit) => undoUnit.isEmpty);
        }

        public get undoUnits(): IUndoUnit[] {
            return this._undoUnits;
        }

        public toString(): string {
            return "Container:\n" + this._undoUnits.map((item) => "\t" + item.toString()).join("\n");
        }
    }
}
