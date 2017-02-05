module Textor
{
    export class ContainerUndoUnit
    {
        private _undoUnits: IUndoUnit[] = [];

        public add(undoUnit: IUndoUnit)
        {
            this._undoUnits.push(undoUnit);
        }

        public undo()
        {
            for (var i: number = 0; i < this._undoUnits.length; i++)
            {
                this._undoUnits[i].undo();
            }
        }

        public redo()
        {
            for (var i: number = 0; i < this._undoUnits.length; i++)
            {
                this._undoUnits[i].redo();
            }
        }

        public get isEmpty(): boolean
        {
            if (this._undoUnits.length > 0)
            {
                for (var i: number = 0; i < this._undoUnits.length; i++)
                {
                    if (!this._undoUnits[i].isEmpty)
                    {
                        return false;
                    }
                }
            }
            return true;
        }

        public get undoUnits(): IUndoUnit[]
        {
            return this._undoUnits;
        }

        public toString(): string
        {   
            var text: string = "Container:\n";
            for (var i: number = 0; i < this._undoUnits.length; i++)
            {
                text += "\t" + this._undoUnits[i].toString() + "\n";
            }
            return text;
        }
    }
}