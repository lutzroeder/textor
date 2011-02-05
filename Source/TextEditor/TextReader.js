
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
