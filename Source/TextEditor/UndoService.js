
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
