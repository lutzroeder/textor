
var TextController = function(textEditor)
{
	this.textEditor = textEditor;

	this.isWebKit = typeof navigator.userAgent.split("WebKit/")[1] !== "undefined";
	this.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
	this.isMozilla = navigator.appVersion.indexOf('Gecko/') >= 0 || ((navigator.userAgent.indexOf("Gecko") >= 0) && !this.isWebKit && (typeof navigator.appVersion !== "undefined"));
	this.isMac = /Mac/.test(navigator.userAgent);

	this.textArea = document.createElement("textarea");
	this.textArea.style.position = "absolute";
	this.textArea.style.top = 0;
	this.textArea.style.left = 0;
	this.textArea.style.width = 0;
	this.textArea.style.height = 0;	
	this.textArea.style.zIndex = -99999;
	this.textArea.style.margin = 0;
	this.textArea.style.border = 0;
	this.textArea.style.padding = "1px";
	this.textArea.style.resize = "none";
	this.textArea.style.outline = "none";
	this.textArea.style.overflow = "hidden";
	this.textArea.style.background = "none";
	this.textArea.value = ".";
	document.body.appendChild(this.textArea);
	this.updateTextAreaPosition();
	
	this.canvas_mouseDownHandler = this.canvas_mouseDown.bind(this);
	this.canvas_mouseWheelHandler = this.canvas_mouseWheel.bind(this);
	this.canvas_touchStartHandler = this.canvas_touchStart.bind(this);
	this.canvas_focusHandler = this.canvas_focus.bind(this);
	this.window_mouseUpHandler = this.window_mouseUp.bind(this);
	this.window_mouseMoveHandler = this.window_mouseMove.bind(this);
	this.canvas_touchEndHandler = this.canvas_touchEnd.bind(this);
	this.canvas_touchMoveHandler = this.canvas_touchMove.bind(this);
	this.textArea_keyUpHandler = this.textArea_keyUp.bind(this);
	this.textArea_keyDownHandler = this.textArea_keyDown.bind(this);
	this.textArea_keyPressHandler = this.textArea_keyPress.bind(this);
	this.textArea_focusHandler = this.textArea_focus.bind(this);
	this.textArea_blurHandler = this.textArea_blur.bind(this);
	this.textArea_cutHandler = this.textArea_cut.bind(this);
	this.textArea_copyHandler = this.textArea_copy.bind(this);
	this.textArea_pasteHandler = this.textArea_paste.bind(this);
	this.textArea_beforeCutHandler = this.textArea_beforeCut.bind(this);
	this.textArea_beforeCopyHandler = this.textArea_beforeCopy.bind(this);

	this.textEditor.canvas.addEventListener("focus", this.canvas_focusHandler, false);
	this.textEditor.canvas.addEventListener(("onmousewheel" in this.textEditor.canvas) ? "mousewheel" : "DOMMouseScroll", this.canvas_mouseWheelHandler, false);
	this.textEditor.canvas.addEventListener("touchstart", this.canvas_touchStartHandler, false);
	this.textEditor.canvas.addEventListener("touchmove", this.canvas_touchMoveHandler, false);
	this.textEditor.canvas.addEventListener("touchend", this.canvas_touchEndHandler, false);
	this.textEditor.canvas.addEventListener("mousedown", this.canvas_mouseDownHandler, false);
	window.addEventListener("mousemove", this.window_mouseMoveHandler, false);
	window.addEventListener("mouseup", this.window_mouseUpHandler, false);

	this.textArea.addEventListener("focus", this.textArea_focusHandler, false);
	this.textArea.addEventListener("blur", this.textArea_blurHandler, false);
	this.textArea.addEventListener("cut", this.textArea_cutHandler, false);
	this.textArea.addEventListener("copy", this.textArea_copyHandler, false);
	this.textArea.addEventListener("paste", this.textArea_pasteHandler, false);
	this.textArea.addEventListener("beforecut", this.textArea_beforeCutHandler, false);
	this.textArea.addEventListener("beforecopy", this.textArea_beforeCopyHandler, false);
	this.textArea.addEventListener("keydown", this.textArea_keyDownHandler, false);
	this.textArea.addEventListener("keypress", this.textArea_keyPressHandler, false);
	this.textArea.addEventListener("keyup", this.textArea_keyUpHandler, false);
};

TextController.prototype.dispose = function()
{
	window.removeEventListener("mousemove", this.window_mouseMoveHandler);
	window.removeEventListener("mouseup", this.window_mouseUpHandler);
	this.textEditor.canvas.removeEventListener("mousedown", this.canvas_mouseDownHandler);
	this.textEditor.canvas.removeEventListener("touchend", this.canvas_touchEndHandler);
	this.textEditor.canvas.removeEventListener("touchmove", this.canvas_touchMoveHandler);
	this.textEditor.canvas.removeEventListener("touchstart", canvas_this.touchStartHandler);
	this.textEditor.canvas.removeEventListener("focus", this.canvas_focusHandler);
	this.textEditor.canvas.removeEventListener(("onmousewheel" in this.textEditor.canvas) ? "mousewheel" : "DOMMouseScroll", this.canvas_mouseWheelHandler, false);
	this.textArea.removeEventListener("focus", this.textArea_focusHandler);
	this.textArea.removeEventListener("blur", this.textArea_blurHandler);
	this.textArea.removeEventListener("cut", this.textArea_cutHandler);
	this.textArea.removeEventListener("copy", this.textArea_copyHandler);
	this.textArea.removeEventListener("paste", this.textArea_pasteHandler);
	this.textArea.removeEventListener("beforecut", this.textArea_beforeCutHandler);
	this.textArea.removeEventListener("beforecopy", this.textArea_beforeCopyHandler);
	this.textArea.removeEventListener("keypress", this.textArea_keyPressHandler);	
	this.textArea.removeEventListener("keyup", this.textArea_keyUpHandler);
	this.textArea.removeEventListener("keydown", this.textArea_keyDownHandler);
};

TextController.prototype.isFocused = function()
{
	return new RegExp("(^|\\s+)" + "focus" + "(\\s+|$)").test(this.textEditor.canvas.className);
};

TextController.prototype.textArea_cut = function(e)
{
	this.textEditor.cut();
};

TextController.prototype.textArea_copy = function(e)
{
	this.textEditor.copy();
};

TextController.prototype.textArea_paste = function(e)
{
	if (this.isMozilla)
	{
		this.textArea.value = "";
		window.setTimeout(function() { 
			var text = this.textArea.value;
			if (text.length > 0)
			{
				this.textEditor.paste(text);
			}
		}.bind(this), 1);
	}
	else if (this.isWebKit)
	{
		var text = e.clipboardData.getData("text/plain");
		this.textEditor.paste(text);
		this.stopEvent(e);
	}
};

TextController.prototype.textArea_beforeCut = function(e)
{
	// select text in the text area so the cut event will fire.
	this.textEditor.copy();
};

TextController.prototype.textArea_beforeCopy = function(e)
{
	this.textEditor.copy();
};

TextController.prototype.textArea_focus = function(e)
{
	if (!this.isFocused())
	{
		this.textEditor.canvas.className += " focus";
	}

	this.textArea.select();
	this.textEditor.invalidate();
	this.textEditor.update();
};

TextController.prototype.textArea_blur = function(e)
{
	if (this.isFocused())
	{
		this.textEditor.canvas.className = this.textEditor.canvas.className.replace(new RegExp(" focus\\b"), "");
	}
	this.textEditor.invalidate();
	// TODO calling update() will cause IE9 Beta1 to flicker
};

TextController.prototype.canvas_focus = function(e)
{
	this.textEditor.focus();
};

TextController.prototype.canvas_mouseDown = function(e)
{
	this.textEditor.focus();

	this.stopEvent(e);
	this.updatePointerPosition(e.pageX, e.pageY);

	var position = this.getTextPosition();

	var clicks = ((e.detail - 1) % 3) + 1;
	if (clicks === 1) // single-click
	{
		if (!e.shiftKey)
		{
			this.pointerDown();
		}
		else
		{
			this.textEditor.selectTo(position.line, position.column);
		}

		this.mouseCapture = true;
		this.startScrollTimer();
	}
	else if (clicks === 2) // double-click
	{
		// select word at position
		this.textEditor.selectWord(position.line, position.column);
		this.mouseCapture = true;
		this.startScrollTimer();
	}
	else if (clicks === 3) // triple-click
	{
		this.textEditor.selectRange(position.line, 0, position.line + 1, 0);
	}

	this.updateMouseCursor();
};

TextController.prototype.window_mouseUp = function(e)
{
	e.preventDefault();
	this.updatePointerPosition(e.pageX, e.pageY);	
	this.pointerUp();
};

TextController.prototype.window_mouseMove = function(e)
{
	e.preventDefault();
	this.updatePointerPosition(e.pageX, e.pageY);
	this.pointerMove();
};

TextController.prototype.canvas_mouseWheel = function(e)
{
	e.preventDefault();

	var delta = e.wheelDelta ? (this.isChrome ? (-e.wheelDelta * 1000) : -e.wheelDelta) : (e.detail ? e.detail * 1000 : 0);
	if (((e.axis) && (e.axis === 1)) || ((e.wheelDeltaX) && (e.wheelDeltaX === -delta)) || (e.shiftKey))
	{
		this.textEditor.scroll(0, Math.floor(delta / 1000));	
	}
	else
	{
		this.textEditor.scroll(Math.floor(delta / 1000), 0);
	}
	this.textEditor.update();
};

TextController.prototype.canvas_touchStart = function(e)
{
	this.textEditor.focus();
	if (e.touches.length === 1)
	{
		e.preventDefault();
		this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
		this.pointerDown();
	}
};

TextController.prototype.canvas_touchMove = function(e)
{
	if (e.touches.length === 1)
	{
		e.preventDefault();
		this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
		this.pointerMove();
	}
};

TextController.prototype.canvas_touchEnd = function(e)
{
	e.preventDefault();
	this.pointerUp();
};

TextController.prototype.textArea_keyUp = function(e)
{
	e.preventDefault();
};

TextController.prototype.textArea_keyDown = function(e)
{
	if (!this.isMozilla)
	{
		if (this.processKey(e.keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey))
		{
			this.textEditor.update();
			this.stopEvent(e);
		}
	}
};

TextController.prototype.textArea_keyPress = function(e)
{
	var keyCode;
	
	if (this.isMozilla)
	{
		if (!(this.keyCodeTable))
		{
			this.keyCodeTable = [];
			var charCodeTable = {
				32: ' ',  48: '0',  49: '1',  50: '2',  51: '3',  52: '4', 53:  '5',  54: '6',  55: '7',  56: '8',  57: '9',  59: ';',  61: '=', 
				65:  'a', 66: 'b',  67: 'c',  68: 'd',  69: 'e',  70: 'f',  71: 'g', 72:  'h',  73: 'i',  74: 'j',  75: 'k',  76: 'l',  77: 'm',  78: 'n', 79:  'o', 80: 'p',  81: 'q',  82: 'r',  83: 's',  84: 't',  85: 'u', 86: 'v', 87: 'w',  88: 'x',  89: 'y',  90: 'z',
				107: '+', 109: '-', 110: '.', 188: ',', 190: '.', 191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: '\"' 
			};

			for (keyCode in charCodeTable)
			{
				var key = charCodeTable[keyCode];
				this.keyCodeTable[key.charCodeAt(0)] = parseInt(keyCode);
				if (key.toUpperCase() != key)
				{
					this.keyCodeTable[key.toUpperCase().charCodeAt(0)] = parseInt(keyCode);
				}
			}
		}
	
		keyCode = ((e.charCode !== 0) && (this.keyCodeTable[e.charCode])) ? this.keyCodeTable[e.charCode] : e.keyCode;
		if (this.processKey(keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey))
		{
			this.textEditor.update();
			this.stopEvent(e);
			return;
		}
	}

	if (!e.ctrlKey && !e.altKey && !e.metaKey && e.charCode !== 0)
	{
		this.stopEvent(e);
		var text = String.fromCharCode(e.charCode);
		this.textEditor.insertText(text);
		this.textEditor.updateScrollPosition();
		this.textEditor.update();
	}
};

TextController.prototype.mouseScroll = function()
{
	var textPosition = this.getTextPosition();
	this.textEditor.selectTo(textPosition.line, textPosition.column);
	this.textEditor.updateScrollPosition();
	this.textEditor.update();
};

TextController.prototype.mouseScroll_interval = function()
{
	var textPosition = this.getTextCoordinate();
	var size = this.textEditor.getSize();
	if ((textPosition.line < 0) || (textPosition.line >= size.line) || (textPosition.column < 0) || (textPosition.column >= size.column))
	{
		this.mouseScroll();
	}
};

TextController.prototype.pointerDown = function()
{
	var textPosition = this.getTextPosition();
	this.textEditor.select(textPosition.line, textPosition.column);
};

TextController.prototype.pointerMove = function()
{
	if (this.mouseCapture)
	{
		this.mouseScroll();
	}
	this.updateMouseCursor();
};

TextController.prototype.pointerUp = function()
{
	this.mouseCapture = false;
	this.stopScrollTimer();
	this.updateMouseCursor();
};

TextController.prototype.startScrollTimer = function()
{
	this.stopScrollTimer();
	this.scrollTimer = window.setInterval(this.mouseScroll_interval.bind(this), 75);
};

TextController.prototype.stopScrollTimer = function()
{
	if (this.scrollTimer !== null)
	{
		window.clearInterval(this.scrollTimer);
		this.scrollTimer = null;
	}	
};

TextController.prototype.stopEvent = function(e)
{
	e.preventDefault();
	e.stopPropagation();
};

TextController.prototype.updateMouseCursor = function()
{
	this.textEditor.canvas.style.cursor = "text";
};

TextController.prototype.updateTextAreaPosition = function()
{
	// hide the textarea under the canvas control
	var point = new Point(0, 0);
	var node = this.textEditor.canvas;
	while (node !== null)
	{
		point.x += node.offsetLeft;
		point.y += node.offsetTop;
		node = node.offsetParent;
	}
	this.textArea.style.top = point.y + "px";	
	this.textArea.style.left = point.x + "px";	
};

TextController.prototype.updatePointerPosition = function(x, y)
{
	this.pointerPosition = new Point(x, y);
	var node = this.textEditor.canvas;
	while (node !== null)
	{
		this.pointerPosition.x -= node.offsetLeft;
		this.pointerPosition.y -= node.offsetTop;
		node = node.offsetParent;
	}
};

TextController.prototype.getTextCoordinate = function()
{
	var x = this.pointerPosition.x + (this.textEditor.getFontSize().width / 2);
	var y = this.pointerPosition.y;
	return this.textEditor.getTextPosition(new Point(x, y));
};

TextController.prototype.getTextPosition = function()
{
	var textPosition = this.getTextCoordinate();
	textPosition.line += this.textEditor.scrollPosition.line;
	textPosition.column += this.textEditor.scrollPosition.column;
	return textPosition;	
};

TextController.prototype.processKey = function(keyCode, shiftKey, ctrlKey, altKey, metaKey)
{
	if (this.isMac)
	{
		if (ctrlKey && !shiftKey && !altKey && !metaKey)
		{
			if (keyCode === 65) // CTRL-A
			{
				ctrlKey = false;
				keyCode = 36; // HOME				
			}
			else if (keyCode === 69) // CTRL-E
			{
				ctrlKey = false;
				keyCode = 35; // END				
			}
		}
		else if (metaKey && keyCode === 37) // COMMAND+LEFT
		{
			metaKey = false;
			keyCode = 36; // HOME
		}
		else if (metaKey && keyCode === 39) // COMMAND+RIGHT
		{
			metaKey = false;
			keyCode = 35; // END
		}
	}

	return this.textEditor.processKey(keyCode, shiftKey, ctrlKey, altKey, metaKey);
};
