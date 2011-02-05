
Function.prototype.bind = function(obj)
{
	var self = this;
	return function()
	{
		return self.apply(obj, arguments);
	};
};
