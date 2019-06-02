namespace Textor {
    export class UndoService {
        private _container: ContainerUndoUnit = null;
        private _stack: ContainerUndoUnit[] = [];
        private _position: number = 0;

        public begin() {
            this._container = new ContainerUndoUnit();
        }

        public cancel() {
            this._container = null;
        }

        public commit() {
            if (!this._container.isEmpty) {
                this._stack.splice(this._position, this._stack.length - this._position);
                this._stack.push(this._container);
                this.redo();

                // try to merge all undo units in last container
                const c1: ContainerUndoUnit = this._stack[this._stack.length - 1];
                for (let i = c1.undoUnits.length - 1; i > 0; i--) {
                    if (!c1.undoUnits[i - 1].merge(c1.undoUnits[i])) {
                        break;
                    }
                    c1.undoUnits.splice(i, 1);
                }

                if (this._stack.length > 1) {
                    // try to merge last container with only one undo unit with last undo unit in previous container
                    const c2: ContainerUndoUnit = this._stack[this._stack.length - 2];
                    if ((c1.undoUnits.length === 1) && (c2.undoUnits.length > 0) &&
                        (c2.undoUnits[c2.undoUnits.length - 1].merge(c1.undoUnits[0]))) {
                        this._stack.splice(this._stack.length - 1, 1);
                        this._position--;
                    }
                }

            }
            this._container = null;
        }

        public add(undoUnit: IUndoUnit) {
            this._container.add(undoUnit);
        }

        public clear() {
            this._stack = [];
            this._position = 0;
        }

        public undo() {
            if (this._position !== 0) {
                this._position--;
                this._stack[this._position].undo();
            }
        }

        public redo() {
            if ((this._stack.length !== 0) && (this._position < this._stack.length)) {
                this._stack[this._position].redo();
                this._position++;
            }
        }

        public toString(): string {
            let text: string = "";
            for (const item of this._stack) {
                text += item.toString();
            }
            return text;
        }
    }
}
