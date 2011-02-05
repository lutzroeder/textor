
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
