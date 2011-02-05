
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
