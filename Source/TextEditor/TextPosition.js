
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
