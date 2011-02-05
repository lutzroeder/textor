
var SelectionUndoUnit = function(textModel, textRange)
{
	this.textModel = textModel;
	this.redoTextRange = textRange;
	this.undoTextRange = this.textModel.getTextRange();
};

SelectionUndoUnit.prototype.undo = function()
{
	this.textModel.selectRange(this.undoTextRange);
};

SelectionUndoUnit.prototype.redo = function()
{
	this.textModel.selectRange(this.redoTextRange);
};

SelectionUndoUnit.prototype.merge = function(undoUnit)
{
	if (undoUnit instanceof SelectionUndoUnit)
	{
		this.redoTextRange = undoUnit.redoTextRange;
		return true;
	}
	return false;
};

SelectionUndoUnit.prototype.toString = function()
{
	return "Selection: " + this.redoTextRange.toString() + " => " + this.undoTextRange.toString();
};
