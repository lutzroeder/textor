module Textor
{
	export interface IUndoUnit
	{
		isEmpty: bool;
		undo(): void;
		redo(): void;
		merge(undoUnit: IUndoUnit): bool;
	}
}
