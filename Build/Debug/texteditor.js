
Function.prototype.bind = function(obj)
{
	var self = this;
	return function()
	{
		return self.apply(obj, arguments);
	};
};

Array.prototype.remove = function(obj)
{
	var i = this.length;
	while (i--)
	{
		if (this[i] === obj)
		{
			this.splice(i, 1);
		}
	}
};

var Event = function()
{
	this.handlers = [];
};

Event.prototype.dispose = function()
{
	this.handlers = [];
};

Event.prototype.add = function(handler, obj)
{
	this.handlers.push({ handler: handler, obj: obj });
};

Event.prototype.remove = function(handler, obj)
{
	for (var i = this.handlers.length - 1; i >= 0; i--)
	{
		if ((this.handlers[i].handler === handler) && (this.handlers[i].obj === obj))
		{
			this.handlers.splice(i, 1);
		}
	}
};

Event.prototype.raise = function()
{
	for (var i = 0; i < this.handlers.length; i++)
	{
		this.handlers[i].handler.apply(this.handlers[i].obj, arguments);
	}
};

var Point = function(x, y)
{
	this.x = x;
	this.y = y;
};

Point.prototype.equals = function(point)
{
	return ((this.x === point.x) && (this.y === point.y));
};

var Size = function(width, height)
{
	this.width = width;
	this.height = height;
};

var Rectangle = function(x, y, width, height)
{
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
};

Rectangle.prototype.union = function(rectangle)
{
	var x1 = (this.x < rectangle.x) ? this.x : rectangle.x;
	var y1 = (this.y < rectangle.y) ? this.y : rectangle.y;
	var x2 = ((this.x + this.width) < (rectangle.x + rectangle.width)) ? (rectangle.x + rectangle.width) : (this.x + this.width);
	var y2 = ((this.y + this.height) < (rectangle.y + rectangle.height)) ? (rectangle.y + rectangle.height) : (this.y + this.height);
	return new Rectangle(x1, y1, x2 - x1, y2 - y1);
};

Rectangle.prototype.toString = function()
{
	return "(" + this.x + "," + this.y + ")-(" + this.width + "," + this.height + ")";
};

var TextPosition = function()
{
	if (arguments.length === 1) // copy constructor
	{
		this.line = arguments[0].line;
		this.column = arguments[0].column;
	}
	if (arguments.length === 2) // (line, column)
	{
		this.line = arguments[0];
		this.column = arguments[1];
	}
};

TextPosition.prototype.equals = function(position)
{
	return ((this.line === position.line) && (this.column === position.column));
};

TextPosition.prototype.compareTo = function(position)
{
    var line = this.line - position.line;
    return (line === 0) ? (this.column - position.column) : line;	
};

TextPosition.prototype.toString = function()
{
	return "(" + this.line + "," + this.column + ")";
};

var TextRange = function()
{
	if (arguments.length === 1) // copy constructor
	{
		this.start = new TextPosition(arguments[0].start);
		this.end = new TextPosition(arguments[0].end);
	}
	if (arguments.length === 2) // (start, end)
	{
		this.start = arguments[0];
		this.end = arguments[1];
	}
};

TextRange.prototype.isEmpty = function()
{
	return ((this.start.line === this.end.line) && (this.start.column === this.end.column));
};

TextRange.prototype.normalize = function()
{
	return (this.start.compareTo(this.end) > 0) ? new TextRange(new TextPosition(this.end), new TextPosition(this.start)) : new TextRange(this);
};

TextRange.prototype.toString = function()
{
	return this.start.toString() + "-" + this.end.toString();
};

var ContainerUndoUnit = function()
{
	this.undoUnits = [];
};

ContainerUndoUnit.prototype.add = function(undoUnit)
{
	this.undoUnits.push(undoUnit);
};

ContainerUndoUnit.prototype.undo = function()
{
	for (var i = 0; i < this.undoUnits.length; i++)
	{
		this.undoUnits[i].undo();
	}
};

ContainerUndoUnit.prototype.redo = function()
{
	for (var i = 0; i < this.undoUnits.length; i++)
	{
		this.undoUnits[i].redo();
	}
};

ContainerUndoUnit.prototype.isEmpty = function()
{
	if (this.undoUnits.length > 0)
	{
		for (var i = 0; i < this.undoUnits.length; i++)
		{
			if (!(this.undoUnits[i].isEmpty) || !this.undoUnits[i].isEmpty())
			{
				return false;
			}
		}
	}
	return true;
};

ContainerUndoUnit.prototype.toString = function()
{	
	var text = "Container:\n";
	for (var i = 0; i < this.undoUnits.length; i++)
	{
		text += "\t" + this.undoUnits[i].toString() + "\n";
	}
	return text;
};

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

var UndoService = function()
{
	this.container = null;
	this.stack = [];
	this.position = 0;
};

UndoService.prototype.begin = function()
{
	this.container = new ContainerUndoUnit();
};

UndoService.prototype.cancel = function()
{
	this.container = null;
};

UndoService.prototype.commit = function()
{
	if (!this.container.isEmpty())
	{
		this.stack.splice(this.position, this.stack.length - this.position);
		this.stack.push(this.container);
		this.redo();

		// try to merge all undo units in last container
		var c1 = this.stack[this.stack.length - 1];
		for (var i = c1.undoUnits.length - 1; i > 0; i--)
		{
			if (!(c1.undoUnits[i - 1].merge) || (!c1.undoUnits[i - 1].merge(c1.undoUnits[i])))
			{
				break;
			}
			c1.undoUnits.splice(i, 1);
		}

		if (this.stack.length > 1)
		{
			// try to merge last container with only one undo unit with last undo unit in previous container
			var c2 = this.stack[this.stack.length - 2];
			if ((c1.undoUnits.length === 1) && (c2.undoUnits.length > 0) && 
				(c2.undoUnits[c2.undoUnits.length - 1].merge) && (c2.undoUnits[c2.undoUnits.length - 1].merge(c1.undoUnits[0])))
			{
				this.stack.splice(this.stack.length - 1, 1);
				this.position--;
			}
		}

	}
	this.container = null;	
};

UndoService.prototype.add = function(undoUnit)
{
	this.container.add(undoUnit);
};

UndoService.prototype.clear = function()
{
	this.stack = [];
	this.position = 0;
};

UndoService.prototype.undo = function()
{
	if (this.position !== 0)
	{
		this.position--;
		this.stack[this.position].undo();
	}
};

UndoService.prototype.redo = function()
{
	if ((this.stack.length !== 0) && (this.position < this.stack.length))
	{
		this.stack[this.position].redo();
		this.position++;
	}
};

UndoService.prototype.toString = function()
{
	var text = "";
	for (var i = 0; i < this.stack.length; i++)
	{
		text += this.stack[i].toString();
	}
	return text;
};

var TextReader = function(textBuffer)
{
	this.textBuffer = textBuffer;
	this.textPosition = new TextPosition(0, 0);
	this.save();
};

TextReader.prototype.peek = function()
{
	if (this.textPosition.line < this.textBuffer.lines.length)
	{
		var text = this.textBuffer.lines[this.textPosition.line];
		return (this.textPosition.column >= text.length) ? '\n' : text[this.textPosition.column];
	}
	return -1;
};

TextReader.prototype.read = function()
{
	if (this.textPosition.line < this.textBuffer.lines.length)
	{
		var text = this.textBuffer.lines[this.textPosition.line];
		var c = (this.textPosition.column >= text.length) ? '\n' : text[this.textPosition.column];
		this.textPosition.column++;
		if (this.textPosition.column > text.length)
		{
			this.textPosition.column = 0;
			this.textPosition.line++;
		}
		return c;
	}
	return -1;
};

TextReader.prototype.match = function(text)
{
	var line = this.textPosition.line;
	var column = this.textPosition.column;
	var index = 0;
	while (index < text.length)
	{
		var c = this.read();
		if ((c === -1) || (c !== text[index]))
		{
			this.textPosition.line = line;
			this.textPosition.column = column;
			return false;
		}
		index++;
	}
	return true;
};

TextReader.prototype.skipWhitespaces = function()
{
	var character;
	var skipped = false;
	while (((character = this.peek()) != -1) && this.isWhitespace(character))
	{
		this.read();
		skipped = true;
	}
	return skipped;
};

TextReader.prototype.isWhitespace = function(character)
{
	return (character === ' ' || character === '\t' || character === '\u00A0');
};

TextReader.prototype.skipLineTerminators = function(character)
{
	var character;
	var skipped = false;
	while (((character = this.peek()) != -1))
	{
		if (character === '\n')
		{
			this.read();
			if (this.peek() === '\r')
			{
				this.read();
			}
			skipped = true;
			continue;
		}
		else if (character === '\r' || character === '\u2028' || character === '\u2029')
		{
			this.read();
			skipped = true;
			continue;
		}
		break;
	}
	return skipped;
};

TextReader.prototype.save = function()
{
	this.lastLine = this.textPosition.line;
	this.lastColumn = this.textPosition.column;
};

TextReader.prototype.restore = function()
{
	this.textPosition = new TextPosition(this.lastLine, this.lastColumn);
};

var LanguageService = function(textEditor)
{
	this.textEditor = textEditor;
	this.language = null;
	this.syntaxTable = [];
};

LanguageService.prototype.setLanguage = function(language)
{
	this.language = language;
};

LanguageService.prototype.getSyntax = function(line)
{
	return (this.syntaxTable[line]) ? this.syntaxTable[line] : [];
};

LanguageService.prototype.add = function(e)
{
	if (this.language !== null)
	{
		// stop existing worker
		if (this.timeout)
		{
			window.clearTimeout(this.timeout);
			delete this.timeout;
		}

		// search backwards to find position with last known state
		var state = null;
		this.line = 0;
		this.column = 0;
		if (this.syntaxTable.length > 0)
		{
			var line = e.oldRange.start.line;
			var index = 0;
			while ((this.syntaxTable[line]) && (index < this.syntaxTable[line].length) && (e.oldRange.start.column > this.syntaxTable[line][index].start))
			{
				index++;
			}
			while ((line >= 0) && (index >= 0))
			{
				index--;
				if (index < 0)
				{
					line--;
					index = this.syntaxTable[line] ? this.syntaxTable[line].length - 1 : 0;
				}
				if (this.syntaxTable[line] && this.syntaxTable[line][index] && this.syntaxTable[line][index].state !== null)
				{
					state = this.syntaxTable[line][index].state;
					this.line = line;
					this.column = this.syntaxTable[line][index].start;
					break;
				}
			}
		}

		// move syntax data that has not changed and clear new range if text is inserted
		this.moveRange(new TextPosition(e.oldRange.end), new TextPosition(e.newRange.end));
		if (e.text.length > 0)
		{
			this.clearRange(e.newRange.start, e.newRange.end);
		}

		// find syntax line index for start position
		this.index = 0;
		while ((this.syntaxTable[this.line]) && (this.index < this.syntaxTable[this.line].length) && (this.column > this.syntaxTable[this.line][this.index].start))
		{
			this.index++;
		}

		// create text reader and initialize language module
		this.textReader = new TextReader(this.textEditor.textBuffer);
		this.textReader.textPosition = new TextPosition(this.line, this.column);
		this.language.begin(this.textReader, state);
		this.style = "text";
		this.window_setTimeout();
	}
};

LanguageService.prototype.window_setTimeout = function()
{
	var timeout = new Date().getTime() + 20;

	var startPosition = new TextPosition(this.line, this.column);
	var line = this.textReader.textPosition.line;
	var column = this.textReader.textPosition.column;

	while (this.textReader.peek() !== -1)
	{
		var data = this.language.read();
		var c = this.textReader.peek();
		if ((c === -1) || (data.style !== null) || (data.state !== null))
		{
			if ((c === -1) || (data.style !== this.style) || (data.state !== this.state) || (data.state !== null))
			{
				if ((c === -1) || (line !== this.line) || (column !== this.column) || (data.state !== null))
				{
					this.addRecord(this.column, line, this.style, this.state);
					this.column = column;
				}
				this.style = data.style;
				this.state = data.state;
			}		
			line = this.textReader.textPosition.line;
			column = this.textReader.textPosition.column;
		}
		
		if (new Date().getTime() > timeout)
		{
			break;
		}
	}
	
	if (this.textReader.peek() !== -1)
	{
		this.timeout = window.setTimeout(this.window_setTimeout.bind(this), 100);
	}
	else
	{
		this.addRecord(this.column, this.line, this.style, null);
	}

	this.textEditor.invalidateRange(new TextRange(startPosition, new TextPosition(this.line, this.column)));
	this.textEditor.update();
};

LanguageService.prototype.moveRange = function(oldPosition, newPosition)
{
	if (oldPosition.compareTo(newPosition) < 0)
	{
		// update data after old position to new position
		var index = 0;
		while ((this.syntaxTable[oldPosition.line]) && (index < this.syntaxTable[oldPosition.line].length) && (oldPosition.column > this.syntaxTable[oldPosition.line][index].start))
		{
			index++;
		}
		if (this.syntaxTable[oldPosition.line])
		{
			var syntax = this.syntaxTable[oldPosition.line].splice(index, this.syntaxTable[oldPosition.line].length - index);
			for (var i = 0; i < syntax.length; i++)
			{
				syntax[i].start += newPosition.column - oldPosition.column;
			}
			var size = newPosition.line - oldPosition.line;
			if (size > 0)
			{
				var newArray = new Array(size);
				for (var i = 0; i < size; i++)
				{
					newArray[i] = (index > 0) ? [ { style: this.syntaxTable[oldPosition.line][index - 1].style, state: null, start: 0 } ] : [];
				}
				var tail = this.syntaxTable.splice(oldPosition.line + 1, this.syntaxTable.length - oldPosition.line + 1);
				this.syntaxTable = this.syntaxTable.concat(newArray, tail);
			}
			this.syntaxTable[newPosition.line] = this.syntaxTable[newPosition.line].concat(syntax);
		}
	}
	else if (oldPosition.compareTo(newPosition) > 0)
	{
		// remove data between old position and new position
		var index = 0;
		if (oldPosition.line >= this.syntaxTable.length)
		{
			oldPosition.line = this.syntaxTable.length - 1;
			index = this.syntaxTable[oldPosition.line].length - 1; 
		}
		else
		{
			while ((this.syntaxTable[oldPosition.line]) && (index < this.syntaxTable[oldPosition.line].length) && (oldPosition.column > this.syntaxTable[oldPosition.line][index].start))
			{
				index++;
			}
		}
		if (this.syntaxTable[oldPosition.line])
		{
			var syntax = this.syntaxTable[oldPosition.line].splice(index, this.syntaxTable[oldPosition.line].length - index);
			for (var i = 0; i < syntax.length; i++)
			{
				syntax[i].start -= oldPosition.column - newPosition.column;
			}
			index = 0;
			while ((this.syntaxTable[newPosition.line]) && (index < this.syntaxTable[newPosition.line].length) && (newPosition.column > this.syntaxTable[newPosition.line][index].start))
			{
				index++;
			}
			this.syntaxTable.splice(newPosition.line + 1, oldPosition.line - newPosition.line);
			this.syntaxTable[newPosition.line].splice(index, this.syntaxTable[newPosition.line].length - index);
			this.syntaxTable[newPosition.line] = this.syntaxTable[newPosition.line].concat(syntax);
		}
	}
};

LanguageService.prototype.clearRange = function(startPosition, endPosition)
{
	if (startPosition.line === endPosition.line)
	{
		var line = this.syntaxTable[startPosition.line];
		if (line)
		{
			var startIndex = -1;
			for (var i = 0; i < line.length; i++)
			{
				if (startIndex === -1 && startPosition.column >= line[i].start)
				{
					startIndex = i;
				}
				if (startIndex !== -1 && endPosition.column >= line[i].start)
				{
					this.syntaxTable[startPosition.line].splice(startIndex, i - startIndex);
					break;
				}
			}
		}
	}
	else
	{
		if (this.syntaxTable[startPosition.line])
		{
			for (var i = this.syntaxTable[startPosition.line].length - 1; i >= 0; i--)
			{
				if (this.syntaxTable[startPosition.line][i].start > startPosition.column)
				{
					this.syntaxTable[startPosition.line].splice(i, 1);
				}
			}
		}

		for (var i = startPosition.line + 1; i < endPosition.line; i++)
		{
			this.syntaxTable[i] = [];
		}

		if (this.syntaxTable[endPosition.line])
		{
			for (var i = this.syntaxTable[endPosition.line].length - 1; i >= 0; i--)
			{
				if (this.syntaxTable[endPosition.line][i].start < endPosition.column)
				{
					this.syntaxTable[endPosition.line].splice(i, 1);
				}
			}
		}
	}
}

LanguageService.prototype.addRecord = function(column, nextLine, style, state)
{
	this.syntaxTable[this.line] = this.syntaxTable[this.line] || [];

	if ((this.index > 0) && ((this.index - 1) < this.syntaxTable[this.line].length) && (this.syntaxTable[this.line][this.index - 1].start === this.column))
	{
		var current = this.syntaxTable[this.line][this.index - 1];
		current.style = style;
		if (state !== null)
		{
			current.state = state;
		}
	}
	else if (this.index < this.syntaxTable[this.line].length)
	{
		var current = this.syntaxTable[this.line][this.index];
		if (column >= current.start)
		{
			current.start = column;
			current.style = style;
			current.state = state;
			this.index++;
		}
		else
		{
			this.syntaxTable[this.line].splice(this.index, 0, { style: style, state: state, start: column });
			this.index++;
		}
	}
	else
	{
		this.syntaxTable[this.line].push({ style: style, state: state, start: column });
		this.index++;
	}
	
	while (this.line < nextLine)
	{
		this.syntaxTable[this.line].splice(this.index, this.syntaxTable[this.line].length - this.index);
		
		this.line++;
		this.index = 0;
		this.addRecord(0, this.line, style, null);
	}
};

LanguageService.prototype.log = function()
{
	for (var line = 0; line < this.syntaxTable.length; line++)
	{
		var text = "line " + line + ": ";
		if (this.syntaxTable[line])
		{
			text += "[ ";
			for (var i = 0; i < this.syntaxTable[line].length; i++)
			{
				text += this.syntaxTable[line][i].start + this.syntaxTable[line][i].style[0] + ((this.syntaxTable[line][i].state !== null) ? "X" : "-") + " ";
			}
			text += " ]";
		}
		console.log(text);
	}
	return "-";
};

var TextBuffer = function()
{
	this.lines = [ "" ];
	this.textChanging = new Event();
	this.textChanged = new Event();
};

TextBuffer.prototype.setText = function(textRange, text)
{
	var lines = text.split('\n');
	var lastLine = lines.length - 1;
	var newRange = new TextRange(new TextPosition(textRange.start), new TextPosition(textRange.start.line + lastLine, ((lines.length === 1) ? textRange.start.column : 0) + lines[lastLine].length));
	lines[0] = this.lines[textRange.start.line].substring(0, textRange.start.column) + lines[0];
	lines[lastLine] = lines[lastLine] + this.lines[textRange.end.line].substring(textRange.end.column);
	this.textChanging.raise(this, { oldRange: textRange, newRange: newRange, text: text });
	this.lines = this.lines.slice(0, textRange.start.line).concat(lines, this.lines.slice(textRange.end.line + 1));
	this.textChanged.raise(this, { oldRange: textRange, newRange: newRange, text: text });
	return newRange;
};

TextBuffer.prototype.getText = function(textRange)
{
	if (textRange.start.line !== textRange.end.line)
	{
		var lines = [];
		lines.push(this.lines[textRange.start.line].substring(textRange.start.column));
		lines = lines.concat(this.lines.slice(textRange.start.line + 1, textRange.end.line));
		lines.push(this.lines[textRange.end.line].substring(0, textRange.end.column));
		return lines.join('\n');
	}
	return this.lines[textRange.start.line].substring(textRange.start.column, textRange.end.column);
};

TextBuffer.prototype.getTextRange = function()
{
	return new TextRange(new TextPosition(0, 0), new TextPosition(this.lines.length - 1, this.lines[this.lines.length - 1].length));
};

TextBuffer.prototype.getLines = function()
{
	return this.lines.length;
};

TextBuffer.prototype.getColumns = function(line)
{
	return this.lines[line].length;
};

TextBuffer.prototype.getLine = function(line)
{
	return this.lines[line];
};

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

var TextController = function(textEditor)
{
	this.textEditor = textEditor;

	this.isWebKit = typeof navigator.userAgent.split("WebKit/")[1] !== "undefined";
	this.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
	this.isMozilla = navigator.appVersion.indexOf('Gecko/') >= 0 || ((navigator.userAgent.indexOf("Gecko") >= 0) && !this.isWebKit && (typeof navigator.appVersion !== "undefined"));
	this.isMac = /Mac/.test(navigator.userAgent);

	this.textArea = document.createElement("textarea");
	this.textArea.style.position = "absolute";
	this.textArea.style.top = 0;
	this.textArea.style.left = 0;
	this.textArea.style.width = 0;
	this.textArea.style.height = 0;	
	this.textArea.style.zIndex = -99999;
	this.textArea.style.margin = 0;
	this.textArea.style.border = 0;
	this.textArea.style.padding = "1px";
	this.textArea.style.resize = "none";
	this.textArea.style.outline = "none";
	this.textArea.style.overflow = "hidden";
	this.textArea.style.background = "none";
	this.textArea.value = ".";
	document.body.appendChild(this.textArea);
	this.updateTextAreaPosition();
	
	this.canvas_mouseDownHandler = this.canvas_mouseDown.bind(this);
	this.canvas_mouseWheelHandler = this.canvas_mouseWheel.bind(this);
	this.canvas_touchStartHandler = this.canvas_touchStart.bind(this);
	this.canvas_focusHandler = this.canvas_focus.bind(this);
	this.window_mouseUpHandler = this.window_mouseUp.bind(this);
	this.window_mouseMoveHandler = this.window_mouseMove.bind(this);
	this.canvas_touchEndHandler = this.canvas_touchEnd.bind(this);
	this.canvas_touchMoveHandler = this.canvas_touchMove.bind(this);
	this.textArea_keyUpHandler = this.textArea_keyUp.bind(this);
	this.textArea_keyDownHandler = this.textArea_keyDown.bind(this);
	this.textArea_keyPressHandler = this.textArea_keyPress.bind(this);
	this.textArea_focusHandler = this.textArea_focus.bind(this);
	this.textArea_blurHandler = this.textArea_blur.bind(this);
	this.textArea_cutHandler = this.textArea_cut.bind(this);
	this.textArea_copyHandler = this.textArea_copy.bind(this);
	this.textArea_pasteHandler = this.textArea_paste.bind(this);
	this.textArea_beforeCutHandler = this.textArea_beforeCut.bind(this);
	this.textArea_beforeCopyHandler = this.textArea_beforeCopy.bind(this);

	this.textEditor.canvas.addEventListener("focus", this.canvas_focusHandler, false);
	this.textEditor.canvas.addEventListener(("onmousewheel" in this.textEditor.canvas) ? "mousewheel" : "DOMMouseScroll", this.canvas_mouseWheelHandler, false);
	this.textEditor.canvas.addEventListener("touchstart", this.canvas_touchStartHandler, false);
	this.textEditor.canvas.addEventListener("touchmove", this.canvas_touchMoveHandler, false);
	this.textEditor.canvas.addEventListener("touchend", this.canvas_touchEndHandler, false);
	this.textEditor.canvas.addEventListener("mousedown", this.canvas_mouseDownHandler, false);
	window.addEventListener("mousemove", this.window_mouseMoveHandler, false);
	window.addEventListener("mouseup", this.window_mouseUpHandler, false);

	this.textArea.addEventListener("focus", this.textArea_focusHandler, false);
	this.textArea.addEventListener("blur", this.textArea_blurHandler, false);
	this.textArea.addEventListener("cut", this.textArea_cutHandler, false);
	this.textArea.addEventListener("copy", this.textArea_copyHandler, false);
	this.textArea.addEventListener("paste", this.textArea_pasteHandler, false);
	this.textArea.addEventListener("beforecut", this.textArea_beforeCutHandler, false);
	this.textArea.addEventListener("beforecopy", this.textArea_beforeCopyHandler, false);
	this.textArea.addEventListener("keydown", this.textArea_keyDownHandler, false);
	this.textArea.addEventListener("keypress", this.textArea_keyPressHandler, false);
	this.textArea.addEventListener("keyup", this.textArea_keyUpHandler, false);
};

TextController.prototype.dispose = function()
{
	window.removeEventListener("mousemove", this.window_mouseMoveHandler);
	window.removeEventListener("mouseup", this.window_mouseUpHandler);
	this.textEditor.canvas.removeEventListener("mousedown", this.canvas_mouseDownHandler);
	this.textEditor.canvas.removeEventListener("touchend", this.canvas_touchEndHandler);
	this.textEditor.canvas.removeEventListener("touchmove", this.canvas_touchMoveHandler);
	this.textEditor.canvas.removeEventListener("touchstart", canvas_this.touchStartHandler);
	this.textEditor.canvas.removeEventListener("focus", this.canvas_focusHandler);
	this.textEditor.canvas.removeEventListener(("onmousewheel" in this.textEditor.canvas) ? "mousewheel" : "DOMMouseScroll", this.canvas_mouseWheelHandler, false);
	this.textArea.removeEventListener("focus", this.textArea_focusHandler);
	this.textArea.removeEventListener("blur", this.textArea_blurHandler);
	this.textArea.removeEventListener("cut", this.textArea_cutHandler);
	this.textArea.removeEventListener("copy", this.textArea_copyHandler);
	this.textArea.removeEventListener("paste", this.textArea_pasteHandler);
	this.textArea.removeEventListener("beforecut", this.textArea_beforeCutHandler);
	this.textArea.removeEventListener("beforecopy", this.textArea_beforeCopyHandler);
	this.textArea.removeEventListener("keypress", this.textArea_keyPressHandler);	
	this.textArea.removeEventListener("keyup", this.textArea_keyUpHandler);
	this.textArea.removeEventListener("keydown", this.textArea_keyDownHandler);
};

TextController.prototype.isFocused = function()
{
	return new RegExp("(^|\\s+)" + "focus" + "(\\s+|$)").test(this.textEditor.canvas.className);
};

TextController.prototype.textArea_cut = function(e)
{
	this.textEditor.cut();
};

TextController.prototype.textArea_copy = function(e)
{
	this.textEditor.copy();
};

TextController.prototype.textArea_paste = function(e)
{
	if (this.isMozilla)
	{
		this.textArea.value = "";
		window.setTimeout(function() { 
			var text = this.textArea.value;
			if (text.length > 0)
			{
				this.textEditor.paste(text);
			}
		}.bind(this), 1);
	}
	else if (this.isWebKit)
	{
		var text = e.clipboardData.getData("text/plain");
		this.textEditor.paste(text);
		this.stopEvent(e);
	}
};

TextController.prototype.textArea_beforeCut = function(e)
{
	// select text in the text area so the cut event will fire.
	this.textEditor.copy();
};

TextController.prototype.textArea_beforeCopy = function(e)
{
	this.textEditor.copy();
};

TextController.prototype.textArea_focus = function(e)
{
	if (!this.isFocused())
	{
		this.textEditor.canvas.className += " focus";
	}

	this.textArea.select();
	this.textEditor.invalidate();
	this.textEditor.update();
};

TextController.prototype.textArea_blur = function(e)
{
	if (this.isFocused())
	{
		this.textEditor.canvas.className = this.textEditor.canvas.className.replace(new RegExp(" focus\\b"), "");
	}
	this.textEditor.invalidate();
	// TODO calling update() will cause IE9 Beta1 to flicker
};

TextController.prototype.canvas_focus = function(e)
{
	this.textEditor.focus();
};

TextController.prototype.canvas_mouseDown = function(e)
{
	this.textEditor.focus();

	this.stopEvent(e);
	this.updatePointerPosition(e.pageX, e.pageY);

	var position = this.getTextPosition();

	var clicks = ((e.detail - 1) % 3) + 1;
	if (clicks === 1) // single-click
	{
		if (!e.shiftKey)
		{
			this.pointerDown();
		}
		else
		{
			this.textEditor.selectTo(position.line, position.column);
		}

		this.mouseCapture = true;
		this.startScrollTimer();
	}
	else if (clicks === 2) // double-click
	{
		// select word at position
		this.textEditor.selectWord(position.line, position.column);
		this.mouseCapture = true;
		this.startScrollTimer();
	}
	else if (clicks === 3) // triple-click
	{
		this.textEditor.selectRange(position.line, 0, position.line + 1, 0);
	}

	this.updateMouseCursor();
};

TextController.prototype.window_mouseUp = function(e)
{
	e.preventDefault();
	this.updatePointerPosition(e.pageX, e.pageY);	
	this.pointerUp();
};

TextController.prototype.window_mouseMove = function(e)
{
	e.preventDefault();
	this.updatePointerPosition(e.pageX, e.pageY);
	this.pointerMove();
};

TextController.prototype.canvas_mouseWheel = function(e)
{
	e.preventDefault();

	var delta = e.wheelDelta ? (this.isChrome ? (-e.wheelDelta * 1000) : -e.wheelDelta) : (e.detail ? e.detail * 1000 : 0);
	if (((e.axis) && (e.axis === 1)) || ((e.wheelDeltaX) && (e.wheelDeltaX === -delta)) || (e.shiftKey))
	{
		this.textEditor.scroll(0, Math.floor(delta / 1000));	
	}
	else
	{
		this.textEditor.scroll(Math.floor(delta / 1000), 0);
	}
	this.textEditor.update();
};

TextController.prototype.canvas_touchStart = function(e)
{
	this.textEditor.focus();
	if (e.touches.length === 1)
	{
		e.preventDefault();
		this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
		this.pointerDown();
	}
};

TextController.prototype.canvas_touchMove = function(e)
{
	if (e.touches.length === 1)
	{
		e.preventDefault();
		this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
		this.pointerMove();
	}
};

TextController.prototype.canvas_touchEnd = function(e)
{
	e.preventDefault();
	this.pointerUp();
};

TextController.prototype.textArea_keyUp = function(e)
{
	e.preventDefault();
};

TextController.prototype.textArea_keyDown = function(e)
{
	if (!this.isMozilla)
	{
		if (this.processKey(e.keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey))
		{
			this.textEditor.update();
			this.stopEvent(e);
		}
	}
};

TextController.prototype.textArea_keyPress = function(e)
{
	var keyCode;
	
	if (this.isMozilla)
	{
		if (!(this.keyCodeTable))
		{
			this.keyCodeTable = [];
			var charCodeTable = {
				32: ' ',  48: '0',  49: '1',  50: '2',  51: '3',  52: '4', 53:  '5',  54: '6',  55: '7',  56: '8',  57: '9',  59: ';',  61: '=', 
				65:  'a', 66: 'b',  67: 'c',  68: 'd',  69: 'e',  70: 'f',  71: 'g', 72:  'h',  73: 'i',  74: 'j',  75: 'k',  76: 'l',  77: 'm',  78: 'n', 79:  'o', 80: 'p',  81: 'q',  82: 'r',  83: 's',  84: 't',  85: 'u', 86: 'v', 87: 'w',  88: 'x',  89: 'y',  90: 'z',
				107: '+', 109: '-', 110: '.', 188: ',', 190: '.', 191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: '\"' 
			};

			for (keyCode in charCodeTable)
			{
				var key = charCodeTable[keyCode];
				this.keyCodeTable[key.charCodeAt(0)] = parseInt(keyCode);
				if (key.toUpperCase() != key)
				{
					this.keyCodeTable[key.toUpperCase().charCodeAt(0)] = parseInt(keyCode);
				}
			}
		}
	
		keyCode = ((e.charCode !== 0) && (this.keyCodeTable[e.charCode])) ? this.keyCodeTable[e.charCode] : e.keyCode;
		if (this.processKey(keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey))
		{
			this.textEditor.update();
			this.stopEvent(e);
			return;
		}
	}

	if (!e.ctrlKey && !e.altKey && !e.metaKey && e.charCode !== 0)
	{
		this.stopEvent(e);
		var text = String.fromCharCode(e.charCode);
		this.textEditor.insertText(text);
		this.textEditor.updateScrollPosition();
		this.textEditor.update();
	}
};

TextController.prototype.mouseScroll = function()
{
	var textPosition = this.getTextPosition();
	this.textEditor.selectTo(textPosition.line, textPosition.column);
	this.textEditor.updateScrollPosition();
	this.textEditor.update();
};

TextController.prototype.mouseScroll_interval = function()
{
	var textPosition = this.getTextCoordinate();
	var size = this.textEditor.getSize();
	if ((textPosition.line < 0) || (textPosition.line >= size.line) || (textPosition.column < 0) || (textPosition.column >= size.column))
	{
		this.mouseScroll();
	}
};

TextController.prototype.pointerDown = function()
{
	var textPosition = this.getTextPosition();
	this.textEditor.select(textPosition.line, textPosition.column);
};

TextController.prototype.pointerMove = function()
{
	if (this.mouseCapture)
	{
		this.mouseScroll();
	}
	this.updateMouseCursor();
};

TextController.prototype.pointerUp = function()
{
	this.mouseCapture = false;
	this.stopScrollTimer();
	this.updateMouseCursor();
};

TextController.prototype.startScrollTimer = function()
{
	this.stopScrollTimer();
	this.scrollTimer = window.setInterval(this.mouseScroll_interval.bind(this), 75);
};

TextController.prototype.stopScrollTimer = function()
{
	if (this.scrollTimer !== null)
	{
		window.clearInterval(this.scrollTimer);
		this.scrollTimer = null;
	}	
};

TextController.prototype.stopEvent = function(e)
{
	e.preventDefault();
	e.stopPropagation();
};

TextController.prototype.updateMouseCursor = function()
{
	this.textEditor.canvas.style.cursor = "text";
};

TextController.prototype.updateTextAreaPosition = function()
{
	// hide the textarea under the canvas control
	var point = new Point(0, 0);
	var node = this.textEditor.canvas;
	while (node !== null)
	{
		point.x += node.offsetLeft;
		point.y += node.offsetTop;
		node = node.offsetParent;
	}
	this.textArea.style.top = point.y + "px";	
	this.textArea.style.left = point.x + "px";	
};

TextController.prototype.updatePointerPosition = function(x, y)
{
	this.pointerPosition = new Point(x, y);
	var node = this.textEditor.canvas;
	while (node !== null)
	{
		this.pointerPosition.x -= node.offsetLeft;
		this.pointerPosition.y -= node.offsetTop;
		node = node.offsetParent;
	}
};

TextController.prototype.getTextCoordinate = function()
{
	var x = this.pointerPosition.x + (this.textEditor.getFontSize().width / 2);
	var y = this.pointerPosition.y;
	return this.textEditor.getTextPosition(new Point(x, y));
};

TextController.prototype.getTextPosition = function()
{
	var textPosition = this.getTextCoordinate();
	textPosition.line += this.textEditor.scrollPosition.line;
	textPosition.column += this.textEditor.scrollPosition.column;
	return textPosition;	
};

TextController.prototype.processKey = function(keyCode, shiftKey, ctrlKey, altKey, metaKey)
{
	if (this.isMac)
	{
		if (ctrlKey && !shiftKey && !altKey && !metaKey)
		{
			if (keyCode === 65) // CTRL-A
			{
				ctrlKey = false;
				keyCode = 36; // HOME				
			}
			else if (keyCode === 69) // CTRL-E
			{
				ctrlKey = false;
				keyCode = 35; // END				
			}
		}
		else if (metaKey && keyCode === 37) // COMMAND+LEFT
		{
			metaKey = false;
			keyCode = 36; // HOME
		}
		else if (metaKey && keyCode === 39) // COMMAND+RIGHT
		{
			metaKey = false;
			keyCode = 35; // END
		}
	}

	return this.textEditor.processKey(keyCode, shiftKey, ctrlKey, altKey, metaKey);
};

var TextEditor = function(element)
{
	this.canvas = element;
	this.context = this.canvas.getContext("2d");
	this.undoService = new UndoService();
	this.textChanging = new Event();
	this.textChanged = new Event();
	this.selectionChanged = new Event();
	this.textBuffer = new TextBuffer();
	this.textBuffer.textChanging.add(this.textBuffer_textChanging, this);
	this.textBuffer.textChanged.add(this.textBuffer_textChanged, this);
	this.textModel = new TextModel(this.undoService, this.textBuffer);
	this.textModel.selectionChanged.add(this.textModel_selectionChanged, this);
	this.textModel.setTabSize(4);
	this.scrollPosition = new TextPosition(0, 0);
	this.textController = new TextController(this);
	this.languageService = new LanguageService(this);
	this.invalidRectangles = [];
	this.maxColumns = -1;
	this.theme = {
		"font-family": "Monaco,Lucida Console,Courier New",		
		"font-size": "12",
		"padding-left": "4",
		"padding-top": "4",
		"background-color": "#ffffff",
		"background-blur-color": "#ffffff",
		"selection-color": "#c0ddf6",
		"selection-blur-color": "#e3f1fe",
		"cursor-color": "#000000",
		"cursor-background-color": "#ededed",
		"text-style": "#000000",
		"punctuation-style": "#666666",
		"comment-style": "#0068c5 italic",
		"keyword-style": "#662266 bold",
		"literal-style": "#005a15",
		"element-style": "#0000AA bold",
		"attribute-style": "#0000AA italic",
		"error-style": "#FF0000 bold",
		"declaration-style": "#000000 bold" };
	this.updateFont();
	this.invalidate();
	this.update();
	this.focus();
};

TextEditor.prototype.dispose = function()
{
	this.textController.dispose();
	this.textController = null;
	this.textModel.selectionChanged.remove(this.textModel_selectionChanged, this);	
	this.textBuffer.textChanged.remove(this.textBuffer_textChanged, this);
	this.textChanged.dispose();
	this.textChanged = null;
	this.selectionChanged.dispose();
	this.selectionChanged = null;
};

TextEditor.prototype.setTheme = function(theme)
{
	var propertyName;
	for (propertyName in theme)
	{
		this.theme[propertyName] = theme[propertyName];
		if (propertyName === "font-family" || propertyName === "font-size")
		{
			this.updateFont();
		}
	}
	this.invalidate();
	this.update();
};

TextEditor.prototype.setLanguage = function(language)
{
	this.languageService.setLanguage(language);
};

TextEditor.prototype.setTabSize = function(tabSize)
{
	this.textModel.setTabSize(tabSize);
	this.invalidate();
	this.update();
};

TextEditor.prototype.focus = function()
{
	this.textController.textArea.focus();
};

TextEditor.prototype.setText = function(text)
{
	this.undoService.begin();
	this.undoService.add(new TextUndoUnit(this.textModel, this.textBuffer, this.textBuffer.getTextRange(), text));
	this.undoService.add(new SelectionUndoUnit(this.textModel, new TextRange(new TextPosition(0, 0), new TextPosition(0, 0))));
	this.undoService.commit();
	this.undoService.clear();
	this.update();	
};

TextEditor.prototype.getText = function()
{
	return this.textBuffer.getText(this.textBuffer.getTextRange());
};

TextEditor.prototype.insertText = function(text)
{
	this.textModel.insertText(text);
};

TextEditor.prototype.deleteSelection = function()
{
	this.textModel.deleteSelection(null);
};

TextEditor.prototype.select = function(line, column)
{
	if (line > (this.textBuffer.getLines() - 1))
	{
		line = this.textBuffer.getLines() - 1;
		if (column > (this.textBuffer.getColumns(line) - 1))
		{
			column = this.textBuffer.getColumns(line) - 1;
		}
	}

	var textPosition = new TextPosition(line, column);
	var startPosition = this.textModel.toScreenPosition(this.textModel.toBufferPosition(textPosition));
	var endPosition = this.textModel.toScreenPosition(this.textModel.toBufferPosition(textPosition));

	this.undoService.begin();
	this.undoService.add(new SelectionUndoUnit(this.textModel, new TextRange(startPosition, endPosition)));
	this.undoService.commit();
	this.updateScrollPosition();
	this.update();
};

TextEditor.prototype.selectRange = function(startLine, startColumn, endLine, endColumn)
{
	this.undoService.begin();
	this.undoService.add(new SelectionUndoUnit(this.textModel, new TextRange(new TextPosition(startLine, startColumn), new TextPosition(endLine, endColumn))));
	this.undoService.commit();
	this.updateScrollPosition();
	this.update();
};

TextEditor.prototype.selectAll = function()
{
	this.undoService.begin();
	this.undoService.add(new SelectionUndoUnit(this.textModel, this.textModel.toScreenRange(this.textBuffer.getTextRange())));
	this.undoService.commit();
	this.update();
};

TextEditor.prototype.selectTo = function(line, column)
{
	var textPosition = new TextPosition(line, column);
	if (textPosition.line < 0) 
	{ 
		textPosition.line = 0; 
	}
	if (textPosition.line >= this.textBuffer.getLines())
	{ 
		textPosition.line = this.textBuffer.getLines() - 1; 
	}
	if (textPosition.column < 0)
	{
		textPosition.column = 0;
	}

	textPosition = this.textModel.toScreenPosition(this.textModel.toBufferPosition(textPosition));
	if (!this.textModel.textRange.end.equals(textPosition))
	{
		this.undoService.begin();
		this.undoService.add(new SelectionUndoUnit(this.textModel, new TextRange(new TextPosition(this.textModel.textRange.start), textPosition)));
		this.undoService.commit();
		this.updateScrollPosition();
		this.update();
	}
};

TextEditor.prototype.selectWord = function(line, column)
{
	var textPosition = this.textModel.toBufferPosition(new TextPosition(line, column));
	var text = this.textBuffer.getLine(textPosition.line);
	var startColumn = this.textModel.findWordBreak(text, textPosition.column + 1, -1);
	var endColumn = this.textModel.findWordBreak(text, textPosition.column, 1);
	var textRange = new TextRange(new TextPosition(textPosition.line, startColumn), new TextPosition(textPosition.line, endColumn));

	this.undoService.begin();
	this.undoService.add(new SelectionUndoUnit(this.textModel, this.textModel.toScreenRange(textRange)));
	this.undoService.commit();
	this.update();
};

TextEditor.prototype.scroll = function(vertical, horizontal)
{
	this.scrollPosition.line += vertical;
	this.scrollPosition.column += horizontal;
	var size = this.getSize();
	var maxLine = ((this.textBuffer.getLines() - size.line) < 0) ? 0 : this.textBuffer.getLines() - size.line;
	var maxColumn = ((this.getMaxColumns() - size.column + 1) < 0) ? 0 : this.getMaxColumns() - size.column + 1;
	if (this.scrollPosition.line < 0)
	{
		this.scrollPosition.line = 0;
	}
	if (this.scrollPosition.line > maxLine)
	{
		this.scrollPosition.line = maxLine;
	}
	if (this.scrollPosition.column < 0)
	{
		this.scrollPosition.column = 0;
	}
	if (this.scrollPosition.column > maxColumn)
	{
		this.scrollPosition.column = maxColumn;
	}
	this.invalidate();
};

TextEditor.prototype.undo = function()
{
	this.undoService.undo();
	this.updateScrollPosition();
	this.update();
};

TextEditor.prototype.redo = function()
{
	this.undoService.redo();
	this.updateScrollPosition();
	this.update();
};

TextEditor.prototype.cut = function()
{
	this.copy();
	this.deleteSelection();
	this.updateScrollPosition();
	this.update();
};

TextEditor.prototype.copy = function()
{
	var textRange = this.textModel.toBufferRange(this.textModel.getTextRange());
	if (!textRange.isEmpty())
	{
		var text = this.textBuffer.getText(textRange);

		if (window.clipboardData && window.clipboardData.getData)
		{
			window.clipboardData.setData("Text", text); // IE
		}
		else if (this.textController.isMozilla || this.textController.isWebKit)
		{
			this.textController.textArea.value = text;
			this.textController.textArea.select();
		}
	}
};

TextEditor.prototype.paste = function(text)
{
	if (text)
	{
		this.insertText(text);
		this.updateScrollPosition();
		this.update();
	}
};

TextEditor.prototype.processKey = function(keyCode, shiftKey, ctrlKey, altKey, metaKey)
{
	if ((ctrlKey || metaKey) && !altKey) // CONTROL or OPTION
	{
		if (keyCode === 65) // 'A' - select all
		{
			this.selectAll();
			return true;
		}
		else if (keyCode === 88) // 'X' - Cut
		{
			if (window.clipboardData && window.clipboardData.setData)
			{
				this.cut();
				return true;
			}
		}
		else if (keyCode === 67) // 'C' - Copy
		{
			if (window.clipboardData && window.clipboardData.setData)
			{
				this.copy();
				return true;
			}
		}
		else if (keyCode === 86) // 'V' - Paste
		{
			if (window.clipboardData && window.clipboardData.getData)
			{
				var text = window.clipboardData.getData("Text");
				if (text)
				{
					this.paste(text);
					return true;
				}
			}
		}
		else if ((keyCode === 90) && (!shiftKey)) // 'Z' - undo
		{
			this.undo();
			return true;
		}
		else if (((keyCode === 90) && (shiftKey)) || (keyCode === 89)) // Y - redo
		{
			this.redo();
			return true;
		}
	}
	
	if (!metaKey && !altKey)
	{
		if (keyCode === 37) // LEFT
		{
			this.textModel.moveCursor("column", !ctrlKey ? 1 : "word", "previous", shiftKey)				
			this.updateScrollPosition();
			return true;
		}
		else if (keyCode === 39) // RIGHT
		{
			this.textModel.moveCursor("column", !ctrlKey ? 1 : "word", "next", shiftKey);
			this.updateScrollPosition();
			return true;
		}
		else if (keyCode === 38) // UP
		{
			if (!ctrlKey)
			{
				this.textModel.moveCursor("line", 1, "previous", shiftKey);
				this.updateScrollPosition();
			}
			else
			{
				this.scroll(-1, 0);
			}
			return true;
		}
		else if (keyCode === 40) // DOWN
		{
			if (!ctrlKey)
			{
				this.textModel.moveCursor("line", 1, "next", shiftKey);
				this.updateScrollPosition();
			}
			else
			{
				this.scroll(+1, 0);
			}
			return true;
		}
		else if (!ctrlKey)
		{
			if (keyCode === 8)  // BACKSPACE
			{
				this.textModel.deleteSelection("previous");
				this.updateScrollPosition();
				return true;
			}
			else if (keyCode === 9) // TAB
			{
				this.insertText("\t");
				this.updateScrollPosition();
				return true;
			}
			else if (keyCode === 13) // RETURN
			{
				this.insertText("\n" + this.textModel.getIndent());
				this.updateScrollPosition();
				return true;
			}
			else if (keyCode === 45) // INS
			{
				this.textModel.insertText(" ");
				this.updateScrollPosition();
				return true;
			}
			else if (keyCode === 46) // DEL
			{
				this.textModel.deleteSelection("next");
				this.updateScrollPosition();
				return true;
			}
			else if (keyCode === 32) // SPACE
			{
				this.insertText(" ");
				this.updateScrollPosition();
				return true;
			}
			else if (keyCode === 33) // PGUP
			{
				if (shiftKey)
				{
					this.textModel.moveCursor("line", this.getSize().line, "previous", shiftKey);
					this.updateScrollPosition();
				}
				else
				{
					this.scroll(-this.getSize().line, 0);
				}
				return true;
			}
			else if (keyCode === 34) // PGDOWN
			{
				if (shiftKey)
				{
					this.textModel.moveCursor("line", this.getSize().line, "next", shiftKey);
					this.updateScrollPosition();
				}
				else
				{
					this.scroll(+this.getSize().line, 0);
				}
				return true;
			}
			else if (keyCode === 35) // END
			{
				this.textModel.moveCursor("column", "boundary", "next", shiftKey);
				this.updateScrollPosition();
				return true;
			}
			else if (keyCode === 36) // HOME
			{
				this.textModel.moveCursor("column", "boundary", "previous", shiftKey);
				this.updateScrollPosition();
				return true;
			}
		}
	}
};

TextEditor.prototype.updateScrollPosition = function()
{
	var line;

	var size = this.getSize();
	size.line--;
	size.column--;

	var textRange = this.textModel.textRange;
	var selection = new TextRange(textRange).end;
	if (selection.line > this.textBuffer.getLines() - 1)
	{
		selection.line = this.textBuffer.getLines() - 1;
	}
	var maxPosition = this.textModel.toScreenPosition(new TextPosition(selection.line, this.textBuffer.getColumns(selection.line)));
	if (selection.column > maxPosition.column - 1)
	{
		selection.column = maxPosition.column - 1;
	}
	selection.line -= this.scrollPosition.line;
	selection.column -= this.scrollPosition.column;

	var vertical = 0;
	var horizontal = 0;

	if (selection.line < 0)
	{
		vertical = selection.line;
	}
	else if (selection.line > size.line)
	{
		vertical = selection.line - size.line;
	}
	
	if (selection.column < 5)
	{
		// scroll left with a 5 character margin
		horizontal = selection.column - 5;
		if (this.scrollPosition.column + horizontal < 0)
		{
			horizontal = -this.scrollPosition.column;
		}
	}
	else if (selection.column > (size.column - 5))
	{
		// scroll right with a 5 character margin
		horizontal = selection.column - size.column + 5;

		var maxColumns = this.getMaxColumns();
		if (this.scrollPosition.column + horizontal + size.column > maxColumns + 1)
		{
			horizontal = maxColumns - size.column - this.scrollPosition.column + 1;
		}
	}
	
	if ((horizontal !== 0) || (vertical !== 0))
	{
		this.scroll(vertical, horizontal);
	}
};

TextEditor.prototype.updateFont = function()
{
	this.context.font = this.theme["font-size"] + "px " + this.theme["font-family"];
	var width = this.context.measureText("XXXXXXXXXXXXXXXXXXXX").width / 20;
	var height = Math.floor(parseFloat(this.theme["font-size"]) * 1.5);
	this.fontSize = new Size(width, height);
};

TextEditor.prototype.getFontSize = function()
{
	return this.fontSize;
};

TextEditor.prototype.getSize = function()
{
	return this.getTextPosition(new Point(this.canvas.width, this.canvas.height));
};

TextEditor.prototype.getTextPosition = function(point)
{
	var padding = { left: parseFloat(this.theme["padding-left"]), top: parseFloat(this.theme["padding-top"]) };
	var fontSize = this.getFontSize();
	var column = Math.floor((point.x - padding.left) / fontSize.width);
	var line = Math.floor((point.y - padding.top) / fontSize.height);
	return new TextPosition(line, column);
};

TextEditor.prototype.getMaxColumns = function()
{
	// find the longest line in the buffer.
	if (this.maxColumns === -1)
	{
		// TODO can this be optimized to update incrementatlly?
		for (var line = 0; line < this.textBuffer.lines.length; line++)
		{
			var length = this.textModel.getColumns(line);
			if (this.maxColumns < length)
			{
				this.maxColumns = length;
			}
		}
	}
	return this.maxColumns;
};

TextEditor.prototype.invalidate = function()
{
	this.invalidateRectangle(new Rectangle(0, 0, this.canvas.width, this.canvas.height));
};

TextEditor.prototype.invalidateSelection = function(textRange)
{
	this.invalidateRange(textRange);

	// invalidate current line including padding area
	var padding = { left: parseFloat(this.theme["padding-left"]), top: parseFloat(this.theme["padding-top"]) };
	var fontSize = this.getFontSize();
	var rectangle = new Rectangle(0, ((textRange.end.line - this.scrollPosition.line) * fontSize.height) + padding.top, this.canvas.width, fontSize.height);
	this.invalidateRectangle(rectangle);
};

TextEditor.prototype.invalidateRange = function(textRange)
{
	var fontSize = this.getFontSize();
	var padding = { left: parseFloat(this.theme["padding-left"]), top: parseFloat(this.theme["padding-top"]) };

	var range = textRange.normalize();
	range.start.line -= this.scrollPosition.line;
	range.end.line -= this.scrollPosition.line;
	range.start.column -= this.scrollPosition.column;
	range.end.column -= this.scrollPosition.column;

	var x = padding.left;
	var y = padding.top + (range.start.line * fontSize.height);

	if (textRange.start.line === textRange.end.line)
	{
		x += range.start.column * fontSize.width;
		width = (range.end.column - range.start.column) *  fontSize.width;		
		this.invalidateRectangle(new Rectangle(x, y , width, fontSize.height));		
	}
	else
	{
		var height = (range.end.line - range.start.line + 1) * fontSize.height;
		this.invalidateRectangle(new Rectangle(x, y, this.canvas.width, height));		
	}
};

TextEditor.prototype.invalidateRectangle = function(rectangle)
{
	if (rectangle.x < 0)
	{
		rectangle.x = 0;
	}
	if (rectangle.y < 0)
	{
		rectangle.y = 0;
	}
	if ((rectangle.x + rectangle.width) > this.canvas.width)
	{
		rectangle.width = this.canvas.width - rectangle.x;
	}
	if ((rectangle.y + rectangle.height) > this.canvas.height)
	{
		rectangle.height = this.canvas.height - rectangle.y;
	}	
	this.invalidRectangles.push(rectangle);
};

TextEditor.prototype.update = function()
{
	if (this.invalidRectangles.length !== 0)
	{
		// merge invalid rectangles to a single clip rectangle
		var clipRectangle = this.invalidRectangles[0];
		for (var i = 1; i < this.invalidRectangles.length; i++) 
		{ 
			clipRectangle = clipRectangle.union(this.invalidRectangles[i]);
		}
		if ((clipRectangle.width !== 0) && (clipRectangle.height !== 0))
		{
			this.context.save();

			// erase all content 
			// this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			// console.log("(" + clipRectangle.x + "," + clipRectangle.y + ")-(" + clipRectangle.width + "," + clipRectangle.height + ")");

			// apply clip rectangle
			this.context.beginPath();
			this.context.rect(clipRectangle.x, clipRectangle.y, clipRectangle.width, clipRectangle.height);
			this.context.clip();

			var focused = this.textController.isFocused();
			
			// erase background
			this.context.fillStyle = focused ? this.theme["background-color"] : this.theme["background-blur-color"];
			this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

			var size = this.getSize();
			var fontSize = this.getFontSize();
			var padding = { left: parseFloat(this.theme["padding-left"]), top: parseFloat(this.theme["padding-top"]) };

			var selection = this.textModel.getTextRange();
			selection.start.line -= this.scrollPosition.line;
			selection.end.line -= this.scrollPosition.line;
			selection.start.column -= this.scrollPosition.column;
			selection.end.column -= this.scrollPosition.column;
			if (this.textModel.isCursor())
			{
				// draw selected line
				this.context.fillStyle = this.theme["cursor-background-color"];
				var y = (selection.start.line * fontSize.height) + padding.top;
				this.context.fillRect(0, y, this.canvas.width, fontSize.height);

				if (this.textModel.blinkState && this.textController.isFocused())
				{
					// draw insertion point
					this.context.fillStyle = this.theme["cursor-color"];
					this.context.fillRect(padding.left + (selection.start.column * fontSize.width), y, 1, fontSize.height);
				}
			}
			else
			{
				// draw selection
				this.context.fillStyle = focused ? this.theme["selection-color"] : this.theme["selection-blur-color"];
				var y = 0;
				for (var line = 0; line < size.line; line++)
				{
					var x = 0;
					var width = this.canvas.width;
					if (line === selection.start.line)
					{
						x = (selection.start.column < 0) ? 0 : selection.start.column * fontSize.width;
					}
					if (line === selection.end.line)
					{
						width = (selection.end.column * fontSize.width) - x;
					}
					if ((line >= selection.start.line) && (line <= selection.end.line) && (width > 0))
					{
						this.context.fillRect(x + padding.left, y + padding.top, width, fontSize.height);
					}
					y += fontSize.height;
				}
			}

			// draw text
			var stylesTable = { "text":true };
			var styles = [ "text" ];
			var font = this.context.font;
			this.context.shadowOffsetX = 0;
			this.context.shadowOffsetY = 0;
			for (var i = 0; i < styles.length; i++)
			{
				// apply style
				var currentStyle = styles[i];
				var theme = this.theme[currentStyle + "-style"];
				var themeProperties = theme.split(' ');
				this.context.fillStyle = themeProperties[0];
				this.context.font = ((themeProperties.length === 2) && (themeProperties[1] === "italic")) ? ("italic " + font) : font;
				if ((themeProperties.length === 2) && (themeProperties[1] === "bold"))
				{
					// fake bold by adding a shadow
					this.context.shadowBlur = (this.textController.isMozilla) ? 0.5 : 1;
					this.context.shadowColor = themeProperties[0];
				}
				else
				{
					this.context.shadowBlur = 0;
					this.context.shadowColor = "rgba(0,0,0,0)";
				}

				var y = Math.floor(fontSize.height * 0.8) + padding.top;
				for (var line = this.scrollPosition.line; line < (this.scrollPosition.line + size.line); line++)
				{
					if (line < this.textBuffer.getLines())
					{
						var text = this.textBuffer.getLine(line);
						var syntax = this.languageService.getSyntax(line);
						var index = 0;
						var style = "text";
						// var state = null;
						var column = 0;
						var position = 0;
						while (position < text.length)
						{
							if (index < syntax.length)
							{
								style = syntax[index].style
								
								// when rendering the first style collect all other styles in use.
								if ((i === 0) && !stylesTable.hasOwnProperty(style))
								{
									stylesTable[style] = true;
									styles.push(style);
								}

								// debug code to show colorizer restart locations
								// if (syntax[index].state !== null)
								// {
								//	this.context.save();
								//	this.context.fillStyle = "#ff0000";
								//	this.context.fillRect((column - this.scrollPosition.column) * fontSize.width + padding.left + 2.5, y - Math.floor(fontSize.height * 0.8) + 0.5, 0.5, fontSize.height - 2);
								//	this.context.restore();
								// }

								index++;
							}
							var length = (index < syntax.length) ? (syntax[index].start - position) : (text.length - position);
							var part = "";
							for (var n = position; n < position + length; n++)
							{
								part += (text[n] !== '\t') ? text[n] : this.textModel.tabText;
							}
							if ((currentStyle === style) && ((column - this.scrollPosition.column + part.length) > 0) && ((column - this.scrollPosition.column) < size.column))
							{
								this.context.fillText(part, (column - this.scrollPosition.column) * fontSize.width + padding.left, y);
							}
							position += length;
							column += part.length; 
						}
					}
					y += fontSize.height;					
				}
			}

			this.context.restore();
		
			// draw clip rectangle
			// this.context.strokeStyle = "#f00";
			// this.context.lineWidth = 2;
			// this.context.strokeRect(clipRectangle.x, clipRectangle.y, clipRectangle.width, clipRectangle.height); 
		}
		
		this.invalidRectangles = [];
		this.textController.updateTextAreaPosition();
	}
};

TextEditor.prototype.textBuffer_textChanging = function(sender, e)
{
	// invalidate old range
	var textRange = this.textModel.toScreenRange(e.oldRange.normalize());
	textRange.end.column = this.getSize().column + this.scrollPosition.column;
	if (textRange.start.line != textRange.end.line)
	{
		textRange.end.line = this.getSize().line + this.scrollPosition.line;
	}
	this.invalidateRange(textRange);

	// propagate the event to client code	
	this.textChanging.raise(this, e);
};

TextEditor.prototype.textBuffer_textChanged = function(sender, e)
{
	// max width of text might have changed
	this.maxColumns = -1;

	// invalidate new range
	var textRange = this.textModel.toScreenRange(e.newRange.normalize());
	textRange.end.column = this.getSize().column + this.scrollPosition.column;
	if (textRange.start.line != textRange.end.line)
	{
		textRange.end.line = this.getSize().line + this.scrollPosition.line;
	}
	this.invalidateRange(textRange);

	this.languageService.add(e);

	// propagate the event to client code	
	this.textChanged.raise(this, e);
};

TextEditor.prototype.textModel_selectionChanged = function(sender, e)
{
	this.invalidateSelection(e.oldRange);
	this.invalidateSelection(e.newRange);

	if (this.blinkTimer)
	{
		window.clearInterval(this.blinkTimer);
		delete this.blinkTimer;
		this.textModel.blinkState = true;
	}

	var textRange = new TextRange(e.newRange);
	if (textRange.isEmpty)
	{
		// timer for blinking cursor
		this.blinkTimer = window.setInterval(function ()
		{
			this.invalidateSelection(textRange);
			this.update();
			this.textModel.blinkState = !this.textModel.blinkState;
		}.bind(this), 600);		
	}
	
	// propagate the event to client code	
	this.selectionChanged.raise(this, e);
};
