
var TextUndoUnit = function(textModel, textBuffer, textRange, text)
{
	this.textModel = textModel;
	this.textBuffer = textBuffer;
	this.redoRange = textRange;
	this.redoText = text;
	this.redoSelection = null;
	this.undoRange = null;
	this.undoText = this.textBuffer.getText(textRange);
	this.undoSelection = this.textModel.getTextRange();
};

TextUndoUnit.prototype.undo = function()
{
	this.textBuffer.setText(this.undoRange, this.undoText);
	this.textModel.selectRange(this.undoSelection);
};

TextUndoUnit.prototype.redo = function()
{
	this.undoRange = this.textBuffer.setText(this.redoRange, this.redoText);
	if (this.redoSelection === null)
	{
		var position = this.textModel.toScreenPosition(this.undoRange.end);
		this.redoSelection = new TextRange(new TextPosition(position), new TextPosition(position));
	}
	this.textModel.selectRange(this.redoSelection);
};

TextUndoUnit.prototype.merge = function(undoUnit)
{
	if (undoUnit instanceof SelectionUndoUnit)
	{
		this.redoSelection = undoUnit.redoTextRange;
		return true;
	}
	return false;
};

TextUndoUnit.prototype.toString = function()
{
	return "Text: " + 
		this.undoRange.toString() + " => " + this.redoRange.toString() + " | \'" + 
		this.undoText.replace(/\t/g, "\\t") + "' => '" + this.redoText.replace(/\t/g, "\\t") + "' | " + 
		this.undoSelection.toString() + " => " + this.redoSelection.toString();
};
