
var Point = function(x, y)
{
	this.x = x;
	this.y = y;
};

Point.prototype.equals = function(point)
{
	return ((this.x === point.x) && (this.y === point.y));
};
