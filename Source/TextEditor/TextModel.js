
var TextModel = function(undoService, textBuffer)
{
	this.textBuffer = textBuffer;
	this.textRange = new TextRange(new TextPosition(0, 0), new TextPosition(0, 0));
	this.undoService = undoService;
	this.selectionChanged = new Event();
	this.blinkTimer = null;
	this.blinkState = true;
};

TextModel.prototype.select = function(textPosition)
{
	if (!textPosition.equals(this.textRange.start) || !textPosition.equals(this.textRange.end))
	{
		var oldRange = this.textRange;
		this.textRange = new TextRange(new TextPosition(textPosition.line, textPosition.column), new TextPosition(textPosition.line, textPosition.column));
		this.selectionChanged.raise(this, { oldRange: oldRange, newRange: this.textRange });
	}
};

TextModel.prototype.selectRange = function(textRange)
{
	if (!textRange.start.equals(this.textRange.start) || !textRange.end.equals(this.textRange.end))
	{
		var oldRange = this.textRange;
		this.textRange = textRange;	
		this.selectionChanged.raise(this, { oldRange: oldRange, newRange: this.textRange });
	}
};

TextModel.prototype.moveCursor = function(dimension, distance, direction, select)
{
	var i, text;
	
	var position = this.textRange.end;
	if (!select)
	{
		position = (direction === "previous") ? this.getTextRange().start : this.getTextRange().end;
		if (dimension === "line")
		{
			position.column = (direction === "previous") ? this.textRange.start.column : this.textRange.end.column;
		}
	}		

	// switch to text buffer units
	position = this.toBufferPosition(position);

	if (dimension === "column")
	{
		if (select || this.isCursor())
		{
			if (distance === "boundary")
			{
				if (direction !== "previous")
				{
					position.column = this.textBuffer.getColumns(position.line);
				}
				else
				{
					// search first non-whitespace character
					text = this.textBuffer.getLine(position.line);
					for (i = 0; i < text.length; i++)
					{
						if ((text[i] !== ' ') && (text[i] !== '\t'))
						{
							position.column = (i === position.column) ? 0 : i;
							break;
						}
					}
				}
			}
			else if (distance === "word")
			{
				text = this.textBuffer.getLine(position.line);
				if ((direction !== "previous") && (position.column >= text.length))
				{
					position.column++;
				}
				else if ((direction === "previous") && (position.column === 0))
				{
					position.column--;
				}
				else
				{
					position.column = this.findWordBreak(text, position.column, (direction == "previous") ? -1 : +1);
				}
			}
			else
			{
				position.column += (direction === "previous") ? -distance : +distance;
			}

			if (position.column < 0)
			{
				position.line--;
				if (position.line < 0)
				{
					position.line = 0;
					position.column = 0;
				}
				else
				{
					position.column = this.textBuffer.getColumns(position.line);
				}
			}

			if (position.column > this.textBuffer.getColumns(position.line))
			{
				position.line++;
				position.column = 0;
				if (position.line >= this.textBuffer.getLines())
				{
					position.line = this.textBuffer.getLines() - 1;
					position.column = this.textBuffer.getColumns(position.line);
				}
			}
		}
	}

	if (dimension === "line")
	{
		if (distance !== "boundrary")
		{
			position.line += (direction === "previous") ? -distance : +distance;
		}
		if (position.line < 0)
		{
			position.line = 0;
			position.column = 0;
		}
		else if (position.line > this.textBuffer.getLines() - 1)
		{
			position.line = this.textBuffer.getLines() - 1;
			position.column = this.textBuffer.getColumns(position.line);
		}
	}

	// switch back to selection units with tabs expanded
	position = this.toScreenPosition(position);

	var textRange = (select) ? 
		new TextRange(new TextPosition(this.textRange.start.line, this.textRange.start.column), position) :
		new TextRange(position, position);

	this.undoService.begin();
	this.undoService.add(new SelectionUndoUnit(this, textRange));
	this.undoService.commit();
};

TextModel.prototype.insertText = function(text)
{
	this.undoService.begin();
	this.undoService.add(new TextUndoUnit(this, this.textBuffer, this.toBufferRange(this.getTextRange()), text));
	this.undoService.commit();	
};

TextModel.prototype.deleteSelection = function(position)
{
	if (!this.isCursor() || (position === null))
	{
		this.insertText("");
	}
	else
	{
		var textRange = this.toBufferRange(this.getTextRange());
		if (position === "previous")
		{
			textRange.start.column--;
			if (textRange.start.column < 0)
			{
				textRange.start.line--;
				if (textRange.start.line < 0)
				{
					textRange.start.line = 0;
					textRange.start.column = 0;
				}
				else
				{
					textRange.start.column = this.textBuffer.getColumns(textRange.start.line);
				}
			}
		}
		else if (position === "next")
		{
			textRange.end.column++;
			if (textRange.end.column > this.textBuffer.getColumns(textRange.end.line))
			{
				textRange.end.line++;
				if (textRange.end.line > this.textBuffer.getLines() - 1)
				{
					textRange.end.line = this.textBuffer.getLines() - 1;
					textRange.end.column = this.textBuffer.getColumns(textRange.end.line);
				}
				else
				{
					textRange.end.column = 0;
				}
			}
		}

		this.undoService.begin();
		this.undoService.add(new TextUndoUnit(this, this.textBuffer, textRange, ""));
		this.undoService.commit();
	}	
};

TextModel.prototype.getTextRange = function()
{
	// return valid range with tabs expanded
	if (this.isCursor())
	{
		var line = this.textRange.start.line;
		var column = this.textRange.start.column;
		if (line >= this.textBuffer.getLines())
		{
			line = this.textBuffer.getLines() - 1;
			column = this.getColumns(line);
		}
		else if (column > this.getColumns(line))
		{
			column = this.getColumns(line);
		}
		return new TextRange(new TextPosition(line, column), new TextPosition(line, column));
	}

	var textRange = new TextRange(this.textRange);
	if (textRange.start.line >= this.textBuffer.getLines())
	{
		textRange.start.line = this.textBuffer.getLines() - 1;
		textRange.start.column = this.getColumns(textRange.start.line);
	}
	if (textRange.end.line >= this.textBuffer.getLines())
	{
		textRange.end.line = this.textBuffer.getLines() - 1;
		textRange.end.column = this.getColumns(textRange.end.line);
	}	
	if (textRange.start.column > this.getColumns(textRange.start.line))
	{
		textRange.start = new TextPosition(textRange.start.line, this.getColumns(textRange.start.line))
	}
	if (textRange.end.column > this.getColumns(textRange.end.line))
	{
		textRange.end = new TextPosition(textRange.end.line, this.getColumns(textRange.end.line))
	}
	return textRange.normalize();
};

TextModel.prototype.isCursor = function()
{
	return this.textRange.isEmpty();
};

TextModel.prototype.setTabSize = function(tabSize)
{
	this.tabSize = tabSize;
	this.tabText = "";
	for (var i = 0; i < this.tabSize; i++)
	{
		this.tabText += " ";
	}
};

TextModel.prototype.getColumns = function(line)
{
	return this.getTabLength(this.textBuffer.getLine(line));
};

TextModel.prototype.getTabLength = function(text)
{
	var tabLength = 0;
	var bufferLength = text.length;
	for (var i = 0; i < bufferLength; i++)
	{
		tabLength += (text[i] === '\t') ? this.tabSize : 1;
	}
	return tabLength;
}

TextModel.prototype.toScreenPosition = function(textPosition)
{
	// transform from text buffer position to selection position.
	var text = this.textBuffer.getLine(textPosition.line).substring(0, textPosition.column);
	var length = this.getTabLength(text) - text.length;
	return new TextPosition(textPosition.line, textPosition.column + length);
};

TextModel.prototype.toBufferPosition = function(textPosition)
{
	// transform from selection position to text buffer position.
	var text = this.textBuffer.getLine(textPosition.line);
	var column = 0;
	for (var i = 0; i < text.length; i++)
	{
		column += (text[i] === '\t') ? this.tabSize : 1;
		if (column > textPosition.column)
		{
			return new TextPosition(textPosition.line, i);
		}
	}
	return new TextPosition(textPosition.line, text.length);
};

TextModel.prototype.toScreenRange = function(textRange)
{
	return new TextRange(this.toScreenPosition(textRange.start), this.toScreenPosition(textRange.end));
};

TextModel.prototype.toBufferRange = function(textRange)
{
	return new TextRange(this.toBufferPosition(textRange.start), this.toBufferPosition(textRange.end));
};

TextModel.prototype.getIndent = function()
{
	var textRange = this.getTextRange();
	if (textRange.isEmpty())
	{
		var text = this.textBuffer.getLine(textRange.end.line);
		var index = 0;
		while ((index < text.length) && (text[index] == "\t" || text[index] == ' '))
		{
			index++;
		}
		text = text.substring(0, index);
		if (textRange.end.column >= this.getTabLength(text))
		{
			return text;
		}
	}
	return "";
}

TextModel.prototype.findWordBreak = function(text, startIndex, increment)
{
	if (increment < 0)
	{
		startIndex += increment;
	}
	var startState = this.isWordSeparator(text[startIndex]);
	for (var i = startIndex; (i >= 0) && (i < text.length); i += increment)
	{
		if (this.isWordSeparator(text[i]) != startState)
		{
			return (increment < 0) ? (i -= increment) : i;
		}
	}
	return (increment < 0) ? 0 : text.length;
}

TextModel.prototype.isWordSeparator = function(character)
{
	var separators = ' \t\'",;.!~@#$%^&*?=<>()[]:\\+-';
	return separators.indexOf(character) !== -1;
};
