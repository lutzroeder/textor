
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
