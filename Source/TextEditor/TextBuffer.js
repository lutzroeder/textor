
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
