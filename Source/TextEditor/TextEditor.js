
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
