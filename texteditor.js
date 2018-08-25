var Textor;
(function (Textor) {
    var ContainerUndoUnit = /** @class */ (function () {
        function ContainerUndoUnit() {
            this._undoUnits = [];
        }
        ContainerUndoUnit.prototype.add = function (undoUnit) {
            this._undoUnits.push(undoUnit);
        };
        ContainerUndoUnit.prototype.undo = function () {
            for (var _i = 0, _a = this._undoUnits; _i < _a.length; _i++) {
                var undoUnit = _a[_i];
                undoUnit.undo();
            }
        };
        ContainerUndoUnit.prototype.redo = function () {
            for (var _i = 0, _a = this._undoUnits; _i < _a.length; _i++) {
                var undoUnit = _a[_i];
                undoUnit.redo();
            }
        };
        Object.defineProperty(ContainerUndoUnit.prototype, "isEmpty", {
            get: function () {
                return this._undoUnits.length > 0 && this._undoUnits.every(function (undoUnit) { return undoUnit.isEmpty; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContainerUndoUnit.prototype, "undoUnits", {
            get: function () {
                return this._undoUnits;
            },
            enumerable: true,
            configurable: true
        });
        ContainerUndoUnit.prototype.toString = function () {
            return "Container:\n" + this._undoUnits.map(function (item) { return "\t" + item.toString(); }).join("\n");
        };
        return ContainerUndoUnit;
    }());
    Textor.ContainerUndoUnit = ContainerUndoUnit;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var LanguageService = /** @class */ (function () {
        function LanguageService(textEditor) {
            this._timeoutEnabled = false;
            this._language = null;
            this._syntaxTable = [];
            this._textEditor = textEditor;
        }
        Object.defineProperty(LanguageService.prototype, "language", {
            get: function () {
                return this._language;
            },
            set: function (value) {
                this._language = value;
            },
            enumerable: true,
            configurable: true
        });
        LanguageService.prototype.getStyles = function (line) {
            if (this._syntaxTable[line]) {
                return this._syntaxTable[line];
            }
            return [];
        };
        LanguageService.prototype.invalidate = function (oldRange, newRange, text) {
            if (this._language !== null) {
                // stop existing worker
                if (this._timeoutEnabled) {
                    window.clearTimeout(this._timeout);
                    this._timeoutEnabled = false;
                }
                // search backwards to find position with last known state
                var state = null;
                this._line = 0;
                this._column = 0;
                if (this._syntaxTable.length > 0) {
                    var line = oldRange.start.line;
                    var index = 0;
                    while ((this._syntaxTable[line]) && (index < this._syntaxTable[line].length) && (oldRange.start.column > this._syntaxTable[line][index].start)) {
                        index++;
                    }
                    while ((line >= 0) && (index >= 0)) {
                        index--;
                        if (index < 0) {
                            line--;
                            index = this._syntaxTable[line] ? this._syntaxTable[line].length - 1 : 0;
                        }
                        if (this._syntaxTable[line] && this._syntaxTable[line][index] && this._syntaxTable[line][index].state !== null) {
                            state = this._syntaxTable[line][index].state;
                            this._line = line;
                            this._column = this._syntaxTable[line][index].start;
                            break;
                        }
                    }
                }
                // move syntax data that has not changed and clear new range if text is inserted
                this.moveRange(oldRange.end.clone(), newRange.end.clone());
                if (text.length > 0) {
                    this.clearRange(newRange.start, newRange.end);
                }
                // find syntax line index for start position
                this._index = 0;
                while ((this._syntaxTable[this._line]) && (this._index < this._syntaxTable[this._line].length) && (this._column > this._syntaxTable[this._line][this._index].start)) {
                    this._index++;
                }
                // create text reader and initialize language module
                this._textReader = this._textEditor.createTextReader();
                this._textReader.textPosition.line = this._line;
                this._textReader.textPosition.column = this._column;
                this._language.begin(this._textReader, state);
                this._style = "text";
                this.window_setTimeout();
            }
        };
        LanguageService.prototype.log = function () {
            for (var line = 0; line < this._syntaxTable.length; line++) {
                var text = "line " + line + ": ";
                if (this._syntaxTable[line]) {
                    text += "[ ";
                    for (var _i = 0, _a = this._syntaxTable[line]; _i < _a.length; _i++) {
                        var item = _a[_i];
                        text += item.start + item.style[0] + ((item.state !== null) ? "X" : "-") + " ";
                    }
                    text += " ]";
                }
                console.log(text);
            }
            return "-";
        };
        LanguageService.prototype.window_setTimeout = function () {
            var timeout = new Date().getTime() + 20;
            var startPosition = new Textor.TextPosition(this._line, this._column);
            var line = this._textReader.textPosition.line;
            var column = this._textReader.textPosition.column;
            while (this._textReader.peek().length > 0) {
                var data = this._language.read();
                var c = this._textReader.peek();
                if ((c.length === 0) || (data.style !== null) || (data.state !== null)) {
                    if ((c.length === 0) || (data.style !== this._style) || (data.state !== this._state) || (data.state !== null)) {
                        if ((c.length === 0) || (line !== this._line) || (column !== this._column) || (data.state !== null)) {
                            this.addRecord(this._column, line, this._style, this._state);
                            this._column = column;
                        }
                        this._style = data.style;
                        this._state = data.state;
                    }
                    line = this._textReader.textPosition.line;
                    column = this._textReader.textPosition.column;
                }
                if (new Date().getTime() > timeout) {
                    break;
                }
            }
            if (this._textReader.peek().length > 0) {
                this._timeout = window.setTimeout(this.window_setTimeout.bind(this), 100);
                this._timeoutEnabled = true;
            }
            else {
                this.addRecord(this._column, this._line, this._style, null);
            }
            this._textEditor.invalidateRange(new Textor.TextRange(startPosition, new Textor.TextPosition(this._line, this._column)));
            this._textEditor.update();
        };
        LanguageService.prototype.moveRange = function (oldPosition, newPosition) {
            if (oldPosition.compareTo(newPosition) < 0) {
                // update data after old position to new position
                var index = 0;
                while ((this._syntaxTable[oldPosition.line]) && (index < this._syntaxTable[oldPosition.line].length) && (oldPosition.column > this._syntaxTable[oldPosition.line][index].start)) {
                    index++;
                }
                if (this._syntaxTable[oldPosition.line]) {
                    var syntax = this._syntaxTable[oldPosition.line].splice(index, this._syntaxTable[oldPosition.line].length - index);
                    for (var _i = 0, syntax_1 = syntax; _i < syntax_1.length; _i++) {
                        var item = syntax_1[_i];
                        item.start += newPosition.column - oldPosition.column;
                    }
                    var size = newPosition.line - oldPosition.line;
                    if (size > 0) {
                        var newArray = new Array(size);
                        for (var i = 0; i < size; i++) {
                            newArray[i] = (index > 0) ? [{ style: this._syntaxTable[oldPosition.line][index - 1].style, state: null, start: 0 }] : [];
                        }
                        var tail = this._syntaxTable.splice(oldPosition.line + 1, this._syntaxTable.length - oldPosition.line + 1);
                        this._syntaxTable = this._syntaxTable.concat(newArray, tail);
                    }
                    this._syntaxTable[newPosition.line] = this._syntaxTable[newPosition.line].concat(syntax);
                }
            }
            else if (oldPosition.compareTo(newPosition) > 0) {
                // remove data between old position and new position
                var index = 0;
                if (oldPosition.line >= this._syntaxTable.length) {
                    oldPosition.line = this._syntaxTable.length - 1;
                    index = this._syntaxTable[oldPosition.line].length - 1;
                }
                else {
                    while ((this._syntaxTable[oldPosition.line]) && (index < this._syntaxTable[oldPosition.line].length) && (oldPosition.column > this._syntaxTable[oldPosition.line][index].start)) {
                        index++;
                    }
                }
                if (this._syntaxTable[oldPosition.line]) {
                    var syntax = this._syntaxTable[oldPosition.line].splice(index, this._syntaxTable[oldPosition.line].length - index);
                    for (var _a = 0, syntax_2 = syntax; _a < syntax_2.length; _a++) {
                        var item = syntax_2[_a];
                        item.start -= oldPosition.column - newPosition.column;
                    }
                    index = 0;
                    while ((this._syntaxTable[newPosition.line]) && (index < this._syntaxTable[newPosition.line].length) && (newPosition.column > this._syntaxTable[newPosition.line][index].start)) {
                        index++;
                    }
                    this._syntaxTable.splice(newPosition.line + 1, oldPosition.line - newPosition.line);
                    this._syntaxTable[newPosition.line].splice(index, this._syntaxTable[newPosition.line].length - index);
                    this._syntaxTable[newPosition.line] = this._syntaxTable[newPosition.line].concat(syntax);
                }
            }
        };
        LanguageService.prototype.clearRange = function (startPosition, endPosition) {
            if (startPosition.line === endPosition.line) {
                var line = this._syntaxTable[startPosition.line];
                if (line) {
                    var startIndex = -1;
                    for (var i = 0; i < line.length; i++) {
                        if (startIndex === -1 && startPosition.column >= line[i].start) {
                            startIndex = i;
                        }
                        if (startIndex !== -1 && endPosition.column >= line[i].start) {
                            this._syntaxTable[startPosition.line].splice(startIndex, i - startIndex);
                            break;
                        }
                    }
                }
            }
            else {
                if (this._syntaxTable[startPosition.line]) {
                    for (var i = this._syntaxTable[startPosition.line].length - 1; i >= 0; i--) {
                        if (this._syntaxTable[startPosition.line][i].start > startPosition.column) {
                            this._syntaxTable[startPosition.line].splice(i, 1);
                        }
                    }
                }
                for (var i = startPosition.line + 1; i < endPosition.line; i++) {
                    this._syntaxTable[i] = [];
                }
                if (this._syntaxTable[endPosition.line]) {
                    for (var i = this._syntaxTable[endPosition.line].length - 1; i >= 0; i--) {
                        if (this._syntaxTable[endPosition.line][i].start < endPosition.column) {
                            this._syntaxTable[endPosition.line].splice(i, 1);
                        }
                    }
                }
            }
        };
        LanguageService.prototype.addRecord = function (column, nextLine, style, state) {
            this._syntaxTable[this._line] = this._syntaxTable[this._line] || [];
            if ((this._index > 0) && ((this._index - 1) < this._syntaxTable[this._line].length) && (this._syntaxTable[this._line][this._index - 1].start === this._column)) {
                var current = this._syntaxTable[this._line][this._index - 1];
                current.style = style;
                if (state !== null) {
                    current.state = state;
                }
            }
            else if (this._index < this._syntaxTable[this._line].length) {
                var current = this._syntaxTable[this._line][this._index];
                if (column >= current.start) {
                    current.start = column;
                    current.style = style;
                    current.state = state;
                    this._index++;
                }
                else {
                    this._syntaxTable[this._line].splice(this._index, 0, new Textor.LanguageStyle(style, state, column));
                    this._index++;
                }
            }
            else {
                this._syntaxTable[this._line].push(new Textor.LanguageStyle(style, state, column));
                this._index++;
            }
            while (this._line < nextLine) {
                this._syntaxTable[this._line].splice(this._index, this._syntaxTable[this._line].length - this._index);
                this._line++;
                this._index = 0;
                this.addRecord(0, this._line, style, null);
            }
        };
        return LanguageService;
    }());
    Textor.LanguageService = LanguageService;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var LanguageStyle = /** @class */ (function () {
        function LanguageStyle(style, state, start) {
            this.style = style;
            this.state = state;
            this.start = start;
        }
        return LanguageStyle;
    }());
    Textor.LanguageStyle = LanguageStyle;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var Point = /** @class */ (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        Point.prototype.equals = function (point) {
            return ((this.x === point.x) && (this.y === point.y));
        };
        return Point;
    }());
    Textor.Point = Point;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var Rectangle = /** @class */ (function () {
        function Rectangle(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
        Rectangle.prototype.union = function (rectangle) {
            var x1 = (this.x < rectangle.x) ? this.x : rectangle.x;
            var y1 = (this.y < rectangle.y) ? this.y : rectangle.y;
            var x2 = ((this.x + this.width) < (rectangle.x + rectangle.width)) ?
                (rectangle.x + rectangle.width) : (this.x + this.width);
            var y2 = ((this.y + this.height) < (rectangle.y + rectangle.height)) ?
                (rectangle.y + rectangle.height) : (this.y + this.height);
            return new Rectangle(x1, y1, x2 - x1, y2 - y1);
        };
        Rectangle.prototype.toString = function () {
            return "(" + this.x + "," + this.y + ")-(" + this.width + "," + this.height + ")";
        };
        return Rectangle;
    }());
    Textor.Rectangle = Rectangle;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var SelectionChangeEvent = /** @class */ (function () {
        function SelectionChangeEvent(oldRange, newRange) {
            this.oldRange = oldRange;
            this.newRange = newRange;
        }
        return SelectionChangeEvent;
    }());
    Textor.SelectionChangeEvent = SelectionChangeEvent;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var SelectionUndoUnit = /** @class */ (function () {
        function SelectionUndoUnit(textModel, textRange) {
            this._textModel = textModel;
            this._redoTextRange = textRange;
            this._undoTextRange = this._textModel.getTextRange();
        }
        SelectionUndoUnit.prototype.undo = function () {
            this._textModel.selectRange(this._undoTextRange);
        };
        SelectionUndoUnit.prototype.redo = function () {
            this._textModel.selectRange(this._redoTextRange);
        };
        Object.defineProperty(SelectionUndoUnit.prototype, "isEmpty", {
            get: function () {
                return false;
            },
            enumerable: true,
            configurable: true
        });
        SelectionUndoUnit.prototype.merge = function (undoUnit) {
            if (undoUnit instanceof SelectionUndoUnit) {
                var selectionUndoUnit = undoUnit;
                this._redoTextRange = selectionUndoUnit.redoTextRange;
                return true;
            }
            return false;
        };
        SelectionUndoUnit.prototype.toString = function () {
            return "Selection: " + this._redoTextRange.toString() + " => " + this._undoTextRange.toString();
        };
        Object.defineProperty(SelectionUndoUnit.prototype, "redoTextRange", {
            get: function () {
                return this._redoTextRange;
            },
            enumerable: true,
            configurable: true
        });
        return SelectionUndoUnit;
    }());
    Textor.SelectionUndoUnit = SelectionUndoUnit;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var Size = /** @class */ (function () {
        function Size(width, height) {
            this.width = width;
            this.height = height;
        }
        return Size;
    }());
    Textor.Size = Size;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextBuffer = /** @class */ (function () {
        function TextBuffer() {
            this._lines = [""];
            this._textChangingHandlers = [];
            this._textChangedHandlers = [];
        }
        TextBuffer.prototype.addEventListener = function (type, callback) {
            switch (type) {
                case "textchanging":
                    this._textChangingHandlers.push(callback);
                    break;
                case "textchanged":
                    this._textChangedHandlers.push(callback);
                    break;
            }
        };
        TextBuffer.prototype.removeEventListener = function (type, callback) {
            switch (type) {
                case "textchanging":
                    this._textChangingHandlers = this._textChangingHandlers.filter(function (item) { return item !== callback; });
                    break;
                case "textchanged":
                    this._textChangedHandlers = this._textChangedHandlers.filter(function (item) { return item !== callback; });
                    break;
            }
        };
        TextBuffer.prototype.setText = function (textRange, text) {
            var lines = text.split("\n");
            var lastLine = lines.length - 1;
            var newRange = new Textor.TextRange(textRange.start.clone(), new Textor.TextPosition(textRange.start.line + lastLine, ((lines.length === 1) ? textRange.start.column : 0) + lines[lastLine].length));
            lines[0] = this._lines[textRange.start.line].substring(0, textRange.start.column) + lines[0];
            lines[lastLine] = lines[lastLine] + this._lines[textRange.end.line].substring(textRange.end.column);
            this.onTextChanging(new Textor.TextChangeEvent(textRange, newRange, text));
            this._lines = this._lines.slice(0, textRange.start.line).concat(lines, this._lines.slice(textRange.end.line + 1));
            this.onTextChanged(new Textor.TextChangeEvent(textRange, newRange, text));
            return newRange;
        };
        TextBuffer.prototype.getText = function (textRange) {
            if (textRange.start.line !== textRange.end.line) {
                var lines = [];
                lines.push(this._lines[textRange.start.line].substring(textRange.start.column));
                lines = lines.concat(this._lines.slice(textRange.start.line + 1, textRange.end.line));
                lines.push(this._lines[textRange.end.line].substring(0, textRange.end.column));
                return lines.join("\n");
            }
            return this._lines[textRange.start.line].substring(textRange.start.column, textRange.end.column);
        };
        TextBuffer.prototype.getTextRange = function () {
            return new Textor.TextRange(new Textor.TextPosition(0, 0), new Textor.TextPosition(this._lines.length - 1, this._lines[this._lines.length - 1].length));
        };
        TextBuffer.prototype.getLines = function () {
            return this._lines.length;
        };
        TextBuffer.prototype.getColumns = function (line) {
            return this._lines[line].length;
        };
        TextBuffer.prototype.getLine = function (line) {
            return this._lines[line];
        };
        TextBuffer.prototype.onTextChanged = function (e) {
            for (var _i = 0, _a = this._textChangedHandlers; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(e);
            }
        };
        TextBuffer.prototype.onTextChanging = function (e) {
            for (var _i = 0, _a = this._textChangingHandlers; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(e);
            }
        };
        return TextBuffer;
    }());
    Textor.TextBuffer = TextBuffer;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextChangeEvent = /** @class */ (function () {
        function TextChangeEvent(oldRange, newRange, text) {
            this.oldRange = oldRange;
            this.newRange = newRange;
            this.text = text;
        }
        return TextChangeEvent;
    }());
    Textor.TextChangeEvent = TextChangeEvent;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextController = /** @class */ (function () {
        function TextController(textEditor, canvas) {
            var _this = this;
            this._textEditor = textEditor;
            this._canvas = canvas;
            this._isWebKit = typeof navigator.userAgent.split("WebKit/")[1] !== "undefined";
            this._isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
            this._isMozilla = navigator.appVersion.indexOf("Gecko/") >= 0 || ((navigator.userAgent.indexOf("Gecko") >= 0) && !this._isWebKit && (typeof navigator.appVersion !== "undefined"));
            this._isMac = /Mac/.test(navigator.userAgent);
            this._textArea = document.createElement("textarea");
            this._textArea.style.position = "absolute";
            this._textArea.style.top = "0";
            this._textArea.style.left = "0";
            this._textArea.style.width = "0";
            this._textArea.style.height = "0";
            this._textArea.style.zIndex = "-99999";
            this._textArea.style.margin = "0";
            this._textArea.style.border = "0";
            this._textArea.style.padding = "1px";
            this._textArea.style.resize = "none";
            this._textArea.style.outline = "none";
            this._textArea.style.overflow = "hidden";
            this._textArea.style.background = "none";
            this._textArea.value = ".";
            document.body.appendChild(this._textArea);
            this.updateTextAreaPosition();
            this._canvas_mouseDownHandler = function (e) { _this.canvas_mouseDown(e); };
            this._canvas_mouseWheelHandler = function (e) { _this.canvas_mouseWheel(e); };
            this._canvas_touchStartHandler = function (e) { _this.canvas_touchStart(e); };
            this._canvas_focusHandler = function (e) { _this.canvas_focus(e); };
            this._window_mouseUpHandler = function (e) { _this.window_mouseUp(e); };
            this._window_mouseMoveHandler = function (e) { _this.window_mouseMove(e); };
            this._canvas_touchEndHandler = function (e) { _this.canvas_touchEnd(e); };
            this._canvas_touchMoveHandler = function (e) { _this.canvas_touchMove(e); };
            this._textArea_keyUpHandler = function (e) { _this.textArea_keyUp(e); };
            this._textArea_keyDownHandler = function (e) { _this.textArea_keyDown(e); };
            this._textArea_keyPressHandler = function (e) { _this.textArea_keyPress(e); };
            this._textArea_focusHandler = function (e) { _this.textArea_focus(e); };
            this._textArea_blurHandler = function (e) { _this.textArea_blur(e); };
            this._textArea_cutHandler = function (e) { _this.textArea_cut(e); };
            this._textArea_copyHandler = function (e) { _this.textArea_copy(e); };
            this._textArea_pasteHandler = function (e) { _this.textArea_paste(e); };
            this._textArea_beforeCutHandler = function (e) { _this.textArea_beforeCut(e); };
            this._textArea_beforeCopyHandler = function (e) { _this.textArea_beforeCopy(e); };
            this._canvas.addEventListener("focus", this._canvas_focusHandler, false);
            this._canvas.addEventListener(("onmousewheel" in this._canvas) ? "mousewheel" : "DOMMouseScroll", this._canvas_mouseWheelHandler, false);
            this._canvas.addEventListener("touchstart", this._canvas_touchStartHandler, false);
            this._canvas.addEventListener("touchmove", this._canvas_touchMoveHandler, false);
            this._canvas.addEventListener("touchend", this._canvas_touchEndHandler, false);
            this._canvas.addEventListener("mousedown", this._canvas_mouseDownHandler, false);
            window.addEventListener("mousemove", this._window_mouseMoveHandler, false);
            window.addEventListener("mouseup", this._window_mouseUpHandler, false);
            this._textArea.addEventListener("focus", this._textArea_focusHandler, false);
            this._textArea.addEventListener("blur", this._textArea_blurHandler, false);
            this._textArea.addEventListener("cut", this._textArea_cutHandler, false);
            this._textArea.addEventListener("copy", this._textArea_copyHandler, false);
            this._textArea.addEventListener("paste", this._textArea_pasteHandler, false);
            this._textArea.addEventListener("beforecut", this._textArea_beforeCutHandler, false);
            this._textArea.addEventListener("beforecopy", this._textArea_beforeCopyHandler, false);
            this._textArea.addEventListener("keydown", this._textArea_keyDownHandler, false);
            this._textArea.addEventListener("keypress", this._textArea_keyPressHandler, false);
            this._textArea.addEventListener("keyup", this._textArea_keyUpHandler, false);
        }
        Object.defineProperty(TextController.prototype, "isMozilla", {
            get: function () {
                return this._isMozilla;
            },
            enumerable: true,
            configurable: true
        });
        TextController.prototype.dispose = function () {
            window.removeEventListener("mousemove", this._window_mouseMoveHandler);
            window.removeEventListener("mouseup", this._window_mouseUpHandler);
            this._canvas.removeEventListener("mousedown", this._canvas_mouseDownHandler);
            this._canvas.removeEventListener("touchend", this._canvas_touchEndHandler);
            this._canvas.removeEventListener("touchmove", this._canvas_touchMoveHandler);
            this._canvas.removeEventListener("touchstart", this._canvas_touchStartHandler);
            this._canvas.removeEventListener("focus", this._canvas_focusHandler);
            this._canvas.removeEventListener(("onmousewheel" in this._canvas) ? "mousewheel" : "DOMMouseScroll", this._canvas_mouseWheelHandler, false);
            this._textArea.removeEventListener("focus", this._textArea_focusHandler);
            this._textArea.removeEventListener("blur", this._textArea_blurHandler);
            this._textArea.removeEventListener("cut", this._textArea_cutHandler);
            this._textArea.removeEventListener("copy", this._textArea_copyHandler);
            this._textArea.removeEventListener("paste", this._textArea_pasteHandler);
            this._textArea.removeEventListener("beforecut", this._textArea_beforeCutHandler);
            this._textArea.removeEventListener("beforecopy", this._textArea_beforeCopyHandler);
            this._textArea.removeEventListener("keypress", this._textArea_keyPressHandler);
            this._textArea.removeEventListener("keyup", this._textArea_keyUpHandler);
            this._textArea.removeEventListener("keydown", this._textArea_keyDownHandler);
        };
        TextController.prototype.isFocused = function () {
            return new RegExp("(^|\\s+)" + "focus" + "(\\s+|$)").test(this._canvas.className);
        };
        TextController.prototype.focus = function () {
            this._textArea.focus();
        };
        TextController.prototype.copy = function (text) {
            if (this._isMozilla || this._isWebKit) {
                this._textArea.value = text;
                this._textArea.select();
            }
        };
        TextController.prototype.updateTextAreaPosition = function () {
            // hide the textarea under the canvas control
            var point = new Textor.Point(0, 0);
            var node = this._canvas;
            while (node !== null) {
                point.x += node.offsetLeft;
                point.y += node.offsetTop;
                node = node.offsetParent;
            }
            this._textArea.style.top = point.y + "px";
            this._textArea.style.left = point.x + "px";
        };
        TextController.prototype.textArea_cut = function (e) {
            this._textEditor.cut();
        };
        TextController.prototype.textArea_copy = function (e) {
            this._textEditor.copy();
        };
        TextController.prototype.textArea_paste = function (e) {
            if (this._isMozilla) {
                this._textArea.value = "";
                window.setTimeout(function () {
                    var text = this._textArea.value;
                    if (text.length > 0) {
                        this._textEditor.paste(text);
                    }
                }.bind(this), 1);
            }
            else if (this._isWebKit) {
                var text = e.clipboardData.getData("text/plain");
                this._textEditor.paste(text);
                this.stopEvent(e);
            }
        };
        TextController.prototype.textArea_beforeCut = function (e) {
            // select text in the text area so the cut event will fire.
            this._textEditor.copy();
        };
        TextController.prototype.textArea_beforeCopy = function (e) {
            this._textEditor.copy();
        };
        TextController.prototype.textArea_focus = function (e) {
            if (!this.isFocused()) {
                this._canvas.className += " focus";
            }
            this._textArea.select();
            this._textEditor.invalidate();
            this._textEditor.update();
        };
        TextController.prototype.textArea_blur = function (e) {
            if (this.isFocused()) {
                this._canvas.className = this._canvas.className.replace(new RegExp(" focus\\b"), "");
            }
            this._textEditor.invalidate();
            // TODO calling update() will cause IE9 Beta1 to flicker
        };
        TextController.prototype.canvas_focus = function (e) {
            this._textEditor.focus();
        };
        TextController.prototype.canvas_mouseDown = function (e) {
            this._textEditor.focus();
            this.stopEvent(e);
            this.updatePointerPosition(e.pageX, e.pageY);
            var position = this.getTextPosition();
            var clicks = ((e.detail - 1) % 3) + 1;
            if (clicks === 1) {
                if (!e.shiftKey) {
                    this.pointerDown();
                }
                else {
                    this._textEditor.selectTo(position.line, position.column);
                }
                this._mouseCapture = true;
                this.startScrollTimer();
            }
            else if (clicks === 2) {
                // select word at position
                this._textEditor.selectWord(position.line, position.column);
                this._mouseCapture = true;
                this.startScrollTimer();
            }
            else if (clicks === 3) {
                this._textEditor.selectRange(position.line, 0, position.line + 1, 0);
            }
            this.updateMouseCursor();
        };
        TextController.prototype.window_mouseUp = function (e) {
            e.preventDefault();
            this.updatePointerPosition(e.pageX, e.pageY);
            this.pointerUp();
        };
        TextController.prototype.window_mouseMove = function (e) {
            e.preventDefault();
            this.updatePointerPosition(e.pageX, e.pageY);
            this.pointerMove();
        };
        TextController.prototype.canvas_mouseWheel = function (e) {
            e.preventDefault();
            var delta = 0;
            if (!e) {
                delta = window.event.wheelDelta / 120;
            }
            if (e.wheelDelta) {
                delta = e.wheelDelta / 120;
            }
            else if (e.detail) {
                delta = -e.detail / 3;
            }
            if (delta !== 0) {
                this._textEditor.scroll(Math.floor(-delta), 0);
                this._textEditor.update();
            }
        };
        TextController.prototype.canvas_touchStart = function (e) {
            this._textEditor.focus();
            if (e.touches.length === 1) {
                e.preventDefault();
                this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
                this.pointerDown();
            }
        };
        TextController.prototype.canvas_touchMove = function (e) {
            if (e.touches.length === 1) {
                e.preventDefault();
                this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
                this.pointerMove();
            }
        };
        TextController.prototype.canvas_touchEnd = function (e) {
            e.preventDefault();
            this.pointerUp();
        };
        TextController.prototype.textArea_keyUp = function (e) {
            e.preventDefault();
        };
        TextController.prototype.textArea_keyDown = function (e) {
            if (!this._isMozilla) {
                if (this.processKey(e.keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey)) {
                    this._textEditor.update();
                    this.stopEvent(e);
                }
            }
        };
        TextController.prototype.textArea_keyPress = function (e) {
            if (this._isMozilla) {
                if (!(this._keyCodeTable)) {
                    this._keyCodeTable = [];
                    var charCodeTable = {
                        32: " ", 48: "0", 49: "1", 50: "2", 51: "3", 52: "4", 53: "5", 54: "6", 55: "7", 56: "8", 57: "9", 59: ";", 61: "=",
                        65: "a", 66: "b", 67: "c", 68: "d", 69: "e", 70: "f", 71: "g", 72: "h", 73: "i", 74: "j", 75: "k", 76: "l", 77: "m", 78: "n", 79: "o", 80: "p", 81: "q", 82: "r", 83: "s", 84: "t", 85: "u", 86: "v", 87: "w", 88: "x", 89: "y", 90: "z",
                        107: "+", 109: "-", 110: ".", 188: ",", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: '\"',
                    };
                    for (var _i = 0, _a = Object.keys(charCodeTable); _i < _a.length; _i++) {
                        var code = _a[_i];
                        var key = charCodeTable[code];
                        this._keyCodeTable[key.charCodeAt(0)] = parseInt(code, 10);
                        if (key.toUpperCase() !== key) {
                            this._keyCodeTable[key.toUpperCase().charCodeAt(0)] = parseInt(code, 10);
                        }
                    }
                }
                var keyCode = ((e.charCode !== 0) && (this._keyCodeTable[e.charCode])) ? this._keyCodeTable[e.charCode] : e.keyCode;
                if (this.processKey(keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey)) {
                    this._textEditor.update();
                    this.stopEvent(e);
                    return;
                }
            }
            // When ctrlKey and altKey both equals true, it means AltGr is pushed. So a valid combination is either false, false or true, true.
            if (e.ctrlKey === e.altKey && !e.metaKey && e.charCode !== 0) {
                this.stopEvent(e);
                var text = String.fromCharCode(e.charCode);
                this._textEditor.insertText(text);
                this._textEditor.updateScrollPosition();
                this._textEditor.update();
            }
        };
        TextController.prototype.mouseScroll = function () {
            var textPosition = this.getTextPosition();
            this._textEditor.selectTo(textPosition.line, textPosition.column);
            this._textEditor.updateScrollPosition();
            this._textEditor.update();
        };
        TextController.prototype.mouseScroll_interval = function () {
            var textPosition = this.getTextCoordinate();
            var size = this._textEditor.size;
            if ((textPosition.line < 0) || (textPosition.line >= size.line) || (textPosition.column < 0) || (textPosition.column >= size.column)) {
                this.mouseScroll();
            }
        };
        TextController.prototype.pointerDown = function () {
            var textPosition = this.getTextPosition();
            this._textEditor.select(textPosition.line, textPosition.column);
        };
        TextController.prototype.pointerMove = function () {
            if (this._mouseCapture) {
                this.mouseScroll();
            }
            this.updateMouseCursor();
        };
        TextController.prototype.pointerUp = function () {
            this._mouseCapture = false;
            this.stopScrollTimer();
            this.updateMouseCursor();
        };
        TextController.prototype.startScrollTimer = function () {
            this.stopScrollTimer();
            this._scrollTimer = window.setInterval(this.mouseScroll_interval.bind(this), 75);
        };
        TextController.prototype.stopScrollTimer = function () {
            if (this._scrollTimer !== null) {
                window.clearInterval(this._scrollTimer);
                this._scrollTimer = null;
            }
        };
        TextController.prototype.stopEvent = function (e) {
            e.preventDefault();
            e.stopPropagation();
        };
        TextController.prototype.updateMouseCursor = function () {
            this._canvas.style.cursor = "text";
        };
        TextController.prototype.updatePointerPosition = function (x, y) {
            var devicePixelRatio = this._textEditor.devicePixelRatio;
            this._pointerPosition = new Textor.Point(x * devicePixelRatio, y * devicePixelRatio);
            var node = this._canvas;
            while (node !== null) {
                this._pointerPosition.x -= node.offsetLeft * devicePixelRatio;
                this._pointerPosition.y -= node.offsetTop * devicePixelRatio;
                node = node.offsetParent;
            }
        };
        TextController.prototype.getTextCoordinate = function () {
            var x = this._pointerPosition.x + (this._textEditor.fontSize.width / 2);
            var y = this._pointerPosition.y;
            return this._textEditor.getTextPosition(new Textor.Point(x, y));
        };
        TextController.prototype.getTextPosition = function () {
            var textPosition = this.getTextCoordinate();
            textPosition.line += this._textEditor.scrollPosition.line;
            textPosition.column += this._textEditor.scrollPosition.column;
            return textPosition;
        };
        TextController.prototype.processKey = function (keyCode, shiftKey, ctrlKey, altKey, metaKey) {
            if (this._isMac) {
                if (ctrlKey && !shiftKey && !altKey && !metaKey) {
                    if (keyCode === 65) {
                        ctrlKey = false;
                        keyCode = 36; // HOME
                    }
                    else if (keyCode === 69) {
                        ctrlKey = false;
                        keyCode = 35; // END
                    }
                }
                else if (metaKey && keyCode === 37) {
                    metaKey = false;
                    keyCode = 36; // HOME
                }
                else if (metaKey && keyCode === 39) {
                    metaKey = false;
                    keyCode = 35; // END
                }
            }
            return this._textEditor.processKey(keyCode, shiftKey, ctrlKey, altKey, metaKey);
        };
        return TextController;
    }());
    Textor.TextController = TextController;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextEditor = /** @class */ (function () {
        function TextEditor(canvas) {
            var _this = this;
            this._undoService = new Textor.UndoService();
            this._textChangingHandlers = [];
            this._textChangedHandlers = [];
            this._selectionChangedHandlers = [];
            this._scrollPosition = new Textor.TextPosition(0, 0);
            this._invalidRectangles = [];
            this._maxColumns = -1;
            this._blinkTimerEnabled = false;
            this._blinkState = true;
            this._canvas = canvas;
            this._context = canvas.getContext("2d");
            this._textBuffer_textChanging = function (e) { _this.textBuffer_textChanging(e); };
            this._textBuffer_textChanged = function (e) { _this.textBuffer_textChanged(e); };
            this._textModel_selectionChanged = function (e) { _this.textModel_selectionChanged(e); };
            this._textBuffer = new Textor.TextBuffer();
            this._textBuffer.addEventListener("textchanging", this._textBuffer_textChanging);
            this._textBuffer.addEventListener("textchanged", this._textBuffer_textChanged);
            this._textModel = new Textor.TextModel(this._undoService, this._textBuffer);
            this._textModel.addEventListener("selectionchanged", this._textModel_selectionChanged);
            this._textModel.tabSize = 4;
            this._textController = new Textor.TextController(this, this._canvas);
            this._languageService = new Textor.LanguageService(this);
            this._themeManager = new Textor.ThemeManager();
            this._theme = this._themeManager.get("default");
            this.updateSize(this._canvas.clientWidth, this._canvas.clientHeight);
            this.focus();
        }
        Object.defineProperty(TextEditor.prototype, "theme", {
            get: function () {
                return this._theme;
            },
            set: function (value) {
                for (var _i = 0, _a = Object.keys(value); _i < _a.length; _i++) {
                    var propertyName = _a[_i];
                    this._theme[propertyName] = value[propertyName];
                    if (propertyName === "fontFamily" || propertyName === "fontSize") {
                        this.updateFont();
                    }
                }
                this.invalidate();
                this.update();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "themeManager", {
            get: function () {
                return this._themeManager;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "language", {
            get: function () {
                return this._languageService.language;
            },
            set: function (value) {
                this._languageService.language = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "tabSize", {
            get: function () {
                return this._textModel.tabSize;
            },
            set: function (value) {
                this._textModel.tabSize = value;
                this.invalidate();
                this.update();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "text", {
            get: function () {
                return this._textBuffer.getText(this._textBuffer.getTextRange());
            },
            set: function (value) {
                this._undoService.begin();
                this._undoService.add(new Textor.TextUndoUnit(this._textModel, this._textBuffer, this._textBuffer.getTextRange(), value));
                this._undoService.add(new Textor.SelectionUndoUnit(this._textModel, new Textor.TextRange(new Textor.TextPosition(0, 0), new Textor.TextPosition(0, 0))));
                this._undoService.commit();
                this._undoService.clear();
                this.update();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "scrollPosition", {
            get: function () {
                return this._scrollPosition;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "fontSize", {
            get: function () {
                return this._fontSize;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "size", {
            get: function () {
                return this.getTextPosition(new Textor.Point(this._canvas.width, this._canvas.height));
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextEditor.prototype, "devicePixelRatio", {
            get: function () {
                if (("devicePixelRatio" in window) && (window.devicePixelRatio > 1)) {
                    return window.devicePixelRatio;
                }
                if (("deviceXDPI" in window.screen) && ("logicalXDPI" in window.screen)) {
                    return window.screen.deviceXDPI / window.screen.logicalXDPI;
                }
                return 1;
            },
            enumerable: true,
            configurable: true
        });
        TextEditor.prototype.dispose = function () {
            this._textController.dispose();
            this._textController = null;
            this._textModel.removeEventListener("selectionchanged", this._textModel_selectionChanged);
            this._textBuffer.removeEventListener("textchanging", this._textBuffer_textChanging);
            this._textBuffer.removeEventListener("textchanged", this._textBuffer_textChanged);
            this._textChangedHandlers = [];
            this._selectionChangedHandlers = [];
        };
        TextEditor.prototype.addEventListener = function (type, callback) {
            switch (type) {
                case "textchanging":
                    this._textChangingHandlers.push(callback);
                    break;
                case "textchanged":
                    this._textChangedHandlers.push(callback);
                    break;
                case "selectionchanged":
                    this._selectionChangedHandlers.push(callback);
                    break;
            }
        };
        TextEditor.prototype.removeEventListener = function (type, callback) {
            switch (type) {
                case "textchanging":
                    this._textChangingHandlers = this._textChangingHandlers.filter(function (item) { return item !== callback; });
                    break;
                case "textchanged":
                    this._textChangedHandlers = this._textChangedHandlers.filter(function (item) { return item !== callback; });
                    break;
                case "selectionchanged":
                    this._selectionChangedHandlers = this._selectionChangedHandlers.filter(function (item) { return item !== callback; });
                    break;
            }
        };
        TextEditor.prototype.focus = function () {
            this._textController.focus();
        };
        TextEditor.prototype.insertText = function (text) {
            this._textModel.insertText(text);
        };
        TextEditor.prototype.deleteSelection = function () {
            this._textModel.deleteSelection(null);
        };
        TextEditor.prototype.select = function (line, column) {
            if (line > (this._textBuffer.getLines() - 1)) {
                line = this._textBuffer.getLines() - 1;
                if (column > (this._textBuffer.getColumns(line) - 1)) {
                    column = this._textBuffer.getColumns(line) - 1;
                }
            }
            var textPosition = new Textor.TextPosition(line, column);
            var startPosition = this._textModel.toScreenPosition(this._textModel.toBufferPosition(textPosition));
            var endPosition = this._textModel.toScreenPosition(this._textModel.toBufferPosition(textPosition));
            this._undoService.begin();
            this._undoService.add(new Textor.SelectionUndoUnit(this._textModel, new Textor.TextRange(startPosition, endPosition)));
            this._undoService.commit();
            this.updateScrollPosition();
            this.update();
        };
        TextEditor.prototype.selectRange = function (startLine, startColumn, endLine, endColumn) {
            this._undoService.begin();
            this._undoService.add(new Textor.SelectionUndoUnit(this._textModel, new Textor.TextRange(new Textor.TextPosition(startLine, startColumn), new Textor.TextPosition(endLine, endColumn))));
            this._undoService.commit();
            this.updateScrollPosition();
            this.update();
        };
        TextEditor.prototype.selectAll = function () {
            this._undoService.begin();
            this._undoService.add(new Textor.SelectionUndoUnit(this._textModel, this._textModel.toScreenRange(this._textBuffer.getTextRange())));
            this._undoService.commit();
            this.update();
        };
        TextEditor.prototype.selectTo = function (line, column) {
            var textPosition = new Textor.TextPosition(line, column);
            if (textPosition.line < 0) {
                textPosition.line = 0;
            }
            if (textPosition.line >= this._textBuffer.getLines()) {
                textPosition.line = this._textBuffer.getLines() - 1;
            }
            if (textPosition.column < 0) {
                textPosition.column = 0;
            }
            textPosition = this._textModel.toScreenPosition(this._textModel.toBufferPosition(textPosition));
            if (!this._textModel.textRange.end.equals(textPosition)) {
                this._undoService.begin();
                this._undoService.add(new Textor.SelectionUndoUnit(this._textModel, new Textor.TextRange(this._textModel.textRange.start.clone(), textPosition)));
                this._undoService.commit();
                this.updateScrollPosition();
                this.update();
            }
        };
        TextEditor.prototype.selectWord = function (line, column) {
            var textPosition = this._textModel.toBufferPosition(new Textor.TextPosition(line, column));
            var text = this._textBuffer.getLine(textPosition.line);
            var startColumn = this._textModel.findWordBreak(text, textPosition.column + 1, -1);
            var endColumn = this._textModel.findWordBreak(text, textPosition.column, 1);
            var textRange = new Textor.TextRange(new Textor.TextPosition(textPosition.line, startColumn), new Textor.TextPosition(textPosition.line, endColumn));
            this._undoService.begin();
            this._undoService.add(new Textor.SelectionUndoUnit(this._textModel, this._textModel.toScreenRange(textRange)));
            this._undoService.commit();
            this.update();
        };
        TextEditor.prototype.scroll = function (vertical, horizontal) {
            this._scrollPosition.line += vertical;
            this._scrollPosition.column += horizontal;
            var size = this.size;
            var maxLine = ((this._textBuffer.getLines() - size.line) < 0) ? 0 : this._textBuffer.getLines() - size.line;
            var maxColumn = ((this.getMaxColumns() - size.column + 1) < 0) ? 0 : this.getMaxColumns() - size.column + 1;
            if (this._scrollPosition.line < 0) {
                this._scrollPosition.line = 0;
            }
            if (this._scrollPosition.line > maxLine) {
                this._scrollPosition.line = maxLine;
            }
            if (this._scrollPosition.column < 0) {
                this._scrollPosition.column = 0;
            }
            if (this._scrollPosition.column > maxColumn) {
                this._scrollPosition.column = maxColumn;
            }
            this.invalidate();
        };
        TextEditor.prototype.undo = function () {
            this._undoService.undo();
            this.updateScrollPosition();
            this.update();
        };
        TextEditor.prototype.redo = function () {
            this._undoService.redo();
            this.updateScrollPosition();
            this.update();
        };
        TextEditor.prototype.cut = function () {
            this.copy();
            this.deleteSelection();
            this.updateScrollPosition();
            this.update();
        };
        TextEditor.prototype.copy = function () {
            var textRange = this._textModel.toBufferRange(this._textModel.getTextRange());
            if (!textRange.isEmpty) {
                var text = this._textBuffer.getText(textRange);
                if (window.clipboardData && window.clipboardData.getData) {
                    window.clipboardData.setData("Text", text); // IE
                }
                else {
                    this._textController.copy(text);
                }
            }
        };
        TextEditor.prototype.paste = function (text) {
            if (text) {
                this.insertText(text);
                this.updateScrollPosition();
                this.update();
            }
        };
        TextEditor.prototype.createTextReader = function () {
            return new Textor.TextReader(this._textBuffer);
        };
        TextEditor.prototype.processKey = function (keyCode, shiftKey, ctrlKey, altKey, metaKey) {
            if ((ctrlKey || metaKey) && !altKey) {
                if (keyCode === 65) {
                    this.selectAll();
                    return true;
                }
                else if (keyCode === 88) {
                    if (window.clipboardData && window.clipboardData.setData) {
                        this.cut();
                        return true;
                    }
                }
                else if (keyCode === 67) {
                    if (window.clipboardData && window.clipboardData.setData) {
                        this.copy();
                        return true;
                    }
                }
                else if (keyCode === 86) {
                    if (window.clipboardData && window.clipboardData.getData) {
                        var text = window.clipboardData.getData("Text");
                        if (text) {
                            this.paste(text);
                            return true;
                        }
                    }
                }
                else if ((keyCode === 90) && (!shiftKey)) {
                    this.undo();
                    return true;
                }
                else if (((keyCode === 90) && (shiftKey)) || (keyCode === 89)) {
                    this.redo();
                    return true;
                }
            }
            if (!metaKey && !altKey) {
                if (keyCode === 37) {
                    this._textModel.moveCursor("column", !ctrlKey ? "1" : "word", "previous", shiftKey);
                    this.updateScrollPosition();
                    return true;
                }
                else if (keyCode === 39) {
                    this._textModel.moveCursor("column", !ctrlKey ? "1" : "word", "next", shiftKey);
                    this.updateScrollPosition();
                    return true;
                }
                else if (keyCode === 38) {
                    if (!ctrlKey) {
                        this._textModel.moveCursor("line", "1", "previous", shiftKey);
                        this.updateScrollPosition();
                    }
                    else {
                        this.scroll(-1, 0);
                    }
                    return true;
                }
                else if (keyCode === 40) {
                    if (!ctrlKey) {
                        this._textModel.moveCursor("line", "1", "next", shiftKey);
                        this.updateScrollPosition();
                    }
                    else {
                        this.scroll(+1, 0);
                    }
                    return true;
                }
                else if (!ctrlKey) {
                    if (keyCode === 8) {
                        this._textModel.deleteSelection("previous");
                        this.updateScrollPosition();
                        return true;
                    }
                    else if (keyCode === 9) {
                        this.insertText("\t");
                        this.updateScrollPosition();
                        return true;
                    }
                    else if (keyCode === 13) {
                        this.insertText("\n" + this._textModel.getIndent());
                        this.updateScrollPosition();
                        return true;
                    }
                    else if (keyCode === 45) {
                        this._textModel.insertText(" ");
                        this.updateScrollPosition();
                        return true;
                    }
                    else if (keyCode === 46) {
                        this._textModel.deleteSelection("next");
                        this.updateScrollPosition();
                        return true;
                    }
                    else if (keyCode === 32) {
                        this.insertText(" ");
                        this.updateScrollPosition();
                        return true;
                    }
                    else if (keyCode === 33) {
                        if (shiftKey) {
                            this._textModel.moveCursor("line", this.size.line.toString(), "previous", shiftKey);
                            this.updateScrollPosition();
                        }
                        else {
                            this.scroll(-this.size.line, 0);
                        }
                        return true;
                    }
                    else if (keyCode === 34) {
                        if (shiftKey) {
                            this._textModel.moveCursor("line", this.size.line.toString(), "next", shiftKey);
                            this.updateScrollPosition();
                        }
                        else {
                            this.scroll(+this.size.line, 0);
                        }
                        return true;
                    }
                    else if (keyCode === 35) {
                        this._textModel.moveCursor("column", "boundary", "next", shiftKey);
                        this.updateScrollPosition();
                        return true;
                    }
                    else if (keyCode === 36) {
                        this._textModel.moveCursor("column", "boundary", "previous", shiftKey);
                        this.updateScrollPosition();
                        return true;
                    }
                }
            }
        };
        TextEditor.prototype.updateScrollPosition = function () {
            var size = this.size;
            size.line--;
            size.column--;
            var textRange = this._textModel.textRange;
            var selection = textRange.end.clone();
            if (selection.line > this._textBuffer.getLines() - 1) {
                selection.line = this._textBuffer.getLines() - 1;
            }
            var maxPosition = this._textModel.toScreenPosition(new Textor.TextPosition(selection.line, this._textBuffer.getColumns(selection.line)));
            if (selection.column > maxPosition.column - 1) {
                selection.column = maxPosition.column - 1;
            }
            selection.line -= this._scrollPosition.line;
            selection.column -= this._scrollPosition.column;
            var vertical = 0;
            var horizontal = 0;
            if (selection.line < 0) {
                vertical = selection.line;
            }
            else if (selection.line > size.line) {
                vertical = selection.line - size.line;
            }
            if (selection.column < 5) {
                // scroll left with a 5 character margin
                horizontal = selection.column - 5;
                if (this._scrollPosition.column + horizontal < 0) {
                    horizontal = -this._scrollPosition.column;
                }
            }
            else if (selection.column > (size.column - 5)) {
                // scroll right with a 5 character margin
                horizontal = selection.column - size.column + 5;
                var maxColumns = this.getMaxColumns();
                if (this._scrollPosition.column + horizontal + size.column > maxColumns + 1) {
                    horizontal = maxColumns - size.column - this._scrollPosition.column + 1;
                }
            }
            if ((horizontal !== 0) || (vertical !== 0)) {
                this.scroll(vertical, horizontal);
            }
        };
        TextEditor.prototype.updateSize = function (width, height) {
            this._canvas.style.width = width.toString();
            this._canvas.style.height = height.toString();
            this._canvas.width = width * this.devicePixelRatio;
            this._canvas.height = height * this.devicePixelRatio;
            this.updateFont();
            this.invalidate();
            this.update();
        };
        TextEditor.prototype.getTextPosition = function (point) {
            var paddingLeft = parseFloat(this._theme.paddingLeft);
            var paddingTop = parseFloat(this._theme.paddingTop);
            var column = Math.floor((point.x - paddingLeft) / this.fontSize.width);
            var line = Math.floor((point.y - paddingTop) / this.fontSize.height);
            return new Textor.TextPosition(line, column);
        };
        TextEditor.prototype.invalidate = function () {
            this.invalidateRectangle(new Textor.Rectangle(0, 0, this._canvas.width, this._canvas.height));
        };
        TextEditor.prototype.invalidateRange = function (textRange) {
            var fontSize = this.fontSize;
            var paddingLeft = parseFloat(this._theme.paddingLeft);
            var paddingTop = parseFloat(this._theme.paddingTop);
            var range = textRange.normalize();
            range.start.line -= this._scrollPosition.line;
            range.end.line -= this._scrollPosition.line;
            range.start.column -= this._scrollPosition.column;
            range.end.column -= this._scrollPosition.column;
            var x = paddingLeft;
            var y = paddingTop + (range.start.line * fontSize.height);
            if (textRange.start.line === textRange.end.line) {
                x += range.start.column * fontSize.width;
                var width = (range.end.column - range.start.column) * fontSize.width;
                this.invalidateRectangle(new Textor.Rectangle(x, y, width, fontSize.height));
            }
            else {
                var height = (range.end.line - range.start.line + 1) * fontSize.height;
                this.invalidateRectangle(new Textor.Rectangle(x, y, this._canvas.width, height));
            }
        };
        TextEditor.prototype.update = function () {
            if (this._invalidRectangles.length !== 0) {
                // merge invalid rectangles to a single clip rectangle
                var clipRectangle = this._invalidRectangles[0];
                for (var i = 1; i < this._invalidRectangles.length; i++) {
                    clipRectangle = clipRectangle.union(this._invalidRectangles[i]);
                }
                if ((clipRectangle.width !== 0) && (clipRectangle.height !== 0)) {
                    this._context.save();
                    // apply clip rectangle
                    this._context.beginPath();
                    this._context.rect(clipRectangle.x, clipRectangle.y, clipRectangle.width, clipRectangle.height);
                    this._context.clip();
                    var focused = this._textController.isFocused();
                    // erase background
                    this._context.fillStyle = focused ? this._theme.backgroundColor : this._theme.backgroundBlurColor;
                    this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
                    var size = this.size;
                    var fontSize = this.fontSize;
                    var paddingLeft = parseFloat(this._theme.paddingLeft);
                    var paddingTop = parseFloat(this._theme.paddingTop);
                    var selection = this._textModel.getTextRange();
                    selection.start.line -= this._scrollPosition.line;
                    selection.end.line -= this._scrollPosition.line;
                    selection.start.column -= this._scrollPosition.column;
                    selection.end.column -= this._scrollPosition.column;
                    if (this._textModel.isCursor()) {
                        // draw selected line
                        this._context.fillStyle = this._theme.cursorBackgroundColor;
                        var y = (selection.start.line * fontSize.height) + paddingTop;
                        this._context.fillRect(0, y, this._canvas.width, fontSize.height);
                        if (this._blinkState && this._textController.isFocused()) {
                            // draw insertion point
                            this._context.fillStyle = this._theme.cursorColor;
                            this._context.fillRect(paddingLeft + (selection.start.column * fontSize.width), y, 1, fontSize.height);
                        }
                    }
                    else {
                        // draw selection
                        this._context.fillStyle = focused ? this._theme.selectionColor : this._theme.selectionBlurColor;
                        var y = 0;
                        for (var line = 0; line < size.line; line++) {
                            var x = 0;
                            var width = this._canvas.width;
                            if (line === selection.start.line) {
                                x = (selection.start.column < 0) ? 0 : selection.start.column * fontSize.width;
                            }
                            if (line === selection.end.line) {
                                width = (selection.end.column * fontSize.width) - x;
                            }
                            if ((line >= selection.start.line) && (line <= selection.end.line) && (width > 0)) {
                                this._context.fillRect(x + paddingLeft, y + paddingTop, width, fontSize.height);
                            }
                            y += fontSize.height;
                        }
                    }
                    // draw text
                    var stylesTable = { text: true };
                    var styles = ["text"];
                    var font = this._context.font;
                    this._context.shadowOffsetX = 0;
                    this._context.shadowOffsetY = 0;
                    for (var i = 0; i < styles.length; i++) {
                        // apply style
                        var currentStyle = styles[i];
                        var theme = this._theme[currentStyle + "Style"];
                        var themeProperties = theme.split(" ");
                        this._context.fillStyle = themeProperties[0];
                        this._context.font = ((themeProperties.length === 2) &&
                            (themeProperties[1] === "italic")) ? ("italic " + font) : font;
                        this._context.font = ((themeProperties.length === 2) &&
                            (themeProperties[1] === "bold")) ? ("bold " + font) : font;
                        var y = Math.floor(fontSize.height * 0.8) + paddingTop;
                        for (var line = this._scrollPosition.line; line < (this._scrollPosition.line + size.line); line++) {
                            if (line < this._textBuffer.getLines()) {
                                var text = this._textBuffer.getLine(line);
                                var syntax = this._languageService.getStyles(line);
                                var index = 0;
                                var style = "text";
                                // var state = null;
                                var column = 0;
                                var position = 0;
                                while (position < text.length) {
                                    if (index < syntax.length) {
                                        style = syntax[index].style;
                                        // when rendering the first style collect all other styles in use.
                                        if ((i === 0) && !stylesTable.hasOwnProperty(style)) {
                                            stylesTable[style] = true;
                                            styles.push(style);
                                        }
                                        // debug code to show colorizer restart locations
                                        // if (syntax[index].state !== null)
                                        // {
                                        //  this._context.save();
                                        //  this._context.fillStyle = "#ff0000";
                                        //  this._context.fillRect((column - this._scrollPosition.column) * fontSize.width + padding.left + 2.5, y - Math.floor(fontSize.height * 0.8) + 0.5, 0.5, fontSize.height - 2);
                                        //  this._context.restore();
                                        // }
                                        index++;
                                    }
                                    var length_1 = (index < syntax.length) ? (syntax[index].start - position) : (text.length - position);
                                    var part = "";
                                    for (var n = position; n < position + length_1; n++) {
                                        part += (text[n] !== "\t") ? text[n] : this._textModel.tabText;
                                    }
                                    if ((currentStyle === style) && ((column - this._scrollPosition.column + part.length) > 0) && ((column - this._scrollPosition.column) < size.column)) {
                                        this._context.fillText(part, (column - this._scrollPosition.column) * fontSize.width + paddingLeft, y);
                                    }
                                    position += length_1;
                                    column += part.length;
                                }
                            }
                            y += fontSize.height;
                        }
                    }
                    this._context.restore();
                    // draw clip rectangle
                    // this._context.strokeStyle = "#f00";
                    // this._context.lineWidth = 2;
                    // this._context.strokeRect(clipRectangle.x, clipRectangle.y, clipRectangle.width, clipRectangle.height);
                }
                this._invalidRectangles = [];
                this._textController.updateTextAreaPosition();
            }
        };
        TextEditor.prototype.updateFont = function () {
            var fontSize = parseFloat(this._theme.fontSize) * this.devicePixelRatio;
            this._context.font = fontSize + "px " + this._theme.fontFamily;
            var width = this._context.measureText("XXXXXXXXXXXXXXXXXXXX").width / 20;
            var height = Math.floor(fontSize * 1.5);
            this._fontSize = new Textor.Size(width, height);
        };
        TextEditor.prototype.getMaxColumns = function () {
            // find the longest line in the buffer.
            if (this._maxColumns === -1) {
                // TODO can this be optimized to update incrementatlly?
                for (var line = 0; line < this._textBuffer.getLines(); line++) {
                    var length_2 = this._textModel.getColumns(line);
                    if (this._maxColumns < length_2) {
                        this._maxColumns = length_2;
                    }
                }
            }
            return this._maxColumns;
        };
        TextEditor.prototype.invalidateSelection = function (textRange) {
            this.invalidateRange(textRange);
            // invalidate current line including padding area
            var paddingLeft = parseFloat(this._theme.paddingLeft);
            var paddingTop = parseFloat(this._theme.paddingTop);
            var fontSize = this.fontSize;
            var rectangle = new Textor.Rectangle(0, ((textRange.end.line - this._scrollPosition.line) * fontSize.height) + paddingTop, this._canvas.width, fontSize.height);
            this.invalidateRectangle(rectangle);
        };
        TextEditor.prototype.invalidateRectangle = function (rectangle) {
            if (rectangle.x < 0) {
                rectangle.x = 0;
            }
            if (rectangle.y < 0) {
                rectangle.y = 0;
            }
            if ((rectangle.x + rectangle.width) > this._canvas.width) {
                rectangle.width = this._canvas.width - rectangle.x;
            }
            if ((rectangle.y + rectangle.height) > this._canvas.height) {
                rectangle.height = this._canvas.height - rectangle.y;
            }
            this._invalidRectangles.push(rectangle);
        };
        TextEditor.prototype.textBuffer_textChanging = function (e) {
            // invalidate old range
            var textRange = this._textModel.toScreenRange(e.oldRange.normalize());
            textRange.end.column = this.size.column + this._scrollPosition.column;
            if (textRange.start.line !== textRange.end.line) {
                textRange.end.line = this.size.line + this._scrollPosition.line;
            }
            this.invalidateRange(textRange);
            // propagate the event to client code
            this.onTextChanging(e);
        };
        TextEditor.prototype.textBuffer_textChanged = function (e) {
            // max width of text might have changed
            this._maxColumns = -1;
            // invalidate new range
            var textRange = this._textModel.toScreenRange(e.newRange.normalize());
            textRange.end.column = this.size.column + this._scrollPosition.column;
            if (textRange.start.line !== textRange.end.line) {
                textRange.end.line = this.size.line + this._scrollPosition.line;
            }
            this.invalidateRange(textRange);
            this._languageService.invalidate(e.oldRange, e.newRange, e.text);
            // propagate the event to client code
            this.onTextChanged(e);
        };
        TextEditor.prototype.textModel_selectionChanged = function (e) {
            this.invalidateSelection(e.oldRange);
            this.invalidateSelection(e.newRange);
            if (this._blinkTimerEnabled) {
                window.clearInterval(this._blinkTimer);
                this._blinkTimerEnabled = false;
                this._blinkState = true;
            }
            var textRange = e.newRange.clone();
            if (textRange.isEmpty) {
                // timer for blinking cursor
                this._blinkTimerEnabled = true;
                this._blinkTimer = window.setInterval(function () {
                    this.invalidateSelection(textRange);
                    this.update();
                    this._blinkState = !this._blinkState;
                }.bind(this), 600);
            }
            // propagate the event to client code
            this.onSelectionChanged(e);
        };
        TextEditor.prototype.onTextChanged = function (e) {
            for (var _i = 0, _a = this._textChangedHandlers; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(e);
            }
        };
        TextEditor.prototype.onTextChanging = function (e) {
            for (var _i = 0, _a = this._textChangingHandlers; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(e);
            }
        };
        TextEditor.prototype.onSelectionChanged = function (e) {
            for (var _i = 0, _a = this._selectionChangedHandlers; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(e);
            }
        };
        return TextEditor;
    }());
    Textor.TextEditor = TextEditor;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextModel = /** @class */ (function () {
        function TextModel(undoService, textBuffer) {
            this._textRange = new Textor.TextRange(new Textor.TextPosition(0, 0), new Textor.TextPosition(0, 0));
            this._selectionChangedHandlers = [];
            this._textBuffer = textBuffer;
            this._undoService = undoService;
        }
        TextModel.prototype.addEventListener = function (type, callback) {
            switch (type) {
                case "selectionchanged":
                    this._selectionChangedHandlers.push(callback);
                    break;
            }
        };
        TextModel.prototype.removeEventListener = function (type, callback) {
            switch (type) {
                case "selectionchanged":
                    this._selectionChangedHandlers = this._selectionChangedHandlers.filter(function (item) { return item !== callback; });
                    break;
            }
        };
        Object.defineProperty(TextModel.prototype, "textRange", {
            get: function () {
                return this._textRange;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextModel.prototype, "tabText", {
            get: function () {
                return this._tabText;
            },
            enumerable: true,
            configurable: true
        });
        TextModel.prototype.select = function (textPosition) {
            if (!textPosition.equals(this._textRange.start) || !textPosition.equals(this._textRange.end)) {
                var oldRange = this._textRange;
                this._textRange = new Textor.TextRange(new Textor.TextPosition(textPosition.line, textPosition.column), new Textor.TextPosition(textPosition.line, textPosition.column));
                this.onSelectionChanged(new Textor.SelectionChangeEvent(oldRange, this._textRange));
            }
        };
        TextModel.prototype.selectRange = function (textRange) {
            if (!textRange.start.equals(this._textRange.start) || !textRange.end.equals(this._textRange.end)) {
                var oldRange = this._textRange;
                this._textRange = textRange;
                this.onSelectionChanged(new Textor.SelectionChangeEvent(oldRange, this._textRange));
            }
        };
        TextModel.prototype.moveCursor = function (dimension, distance, direction, select) {
            var position = this._textRange.end;
            if (!select) {
                position = (direction === "previous") ? this.getTextRange().start : this.getTextRange().end;
                if (dimension === "line") {
                    position.column =
                        (direction === "previous") ? this._textRange.start.column : this._textRange.end.column;
                }
            }
            // switch to text buffer units
            position = this.toBufferPosition(position);
            if (dimension === "column") {
                if (select || this.isCursor()) {
                    if (distance === "boundary") {
                        if (direction !== "previous") {
                            position.column = this._textBuffer.getColumns(position.line);
                        }
                        else {
                            // search first non-whitespace character
                            var text = this._textBuffer.getLine(position.line);
                            for (var i = 0; i < text.length; i++) {
                                if ((text[i] !== " ") && (text[i] !== "\t")) {
                                    position.column = (i === position.column) ? 0 : i;
                                    break;
                                }
                            }
                        }
                    }
                    else if (distance === "word") {
                        var text = this._textBuffer.getLine(position.line);
                        if ((direction !== "previous") && (position.column >= text.length)) {
                            position.column++;
                        }
                        else if ((direction === "previous") && (position.column === 0)) {
                            position.column--;
                        }
                        else {
                            position.column = this.findWordBreak(text, position.column, (direction === "previous") ? -1 : +1);
                        }
                    }
                    else {
                        position.column += (direction === "previous") ? -Number(distance) : +Number(distance);
                    }
                    if (position.column < 0) {
                        position.line--;
                        if (position.line < 0) {
                            position.line = 0;
                            position.column = 0;
                        }
                        else {
                            position.column = this._textBuffer.getColumns(position.line);
                        }
                    }
                    if (position.column > this._textBuffer.getColumns(position.line)) {
                        position.line++;
                        position.column = 0;
                        if (position.line >= this._textBuffer.getLines()) {
                            position.line = this._textBuffer.getLines() - 1;
                            position.column = this._textBuffer.getColumns(position.line);
                        }
                    }
                }
            }
            if (dimension === "line") {
                if (distance !== "boundrary") {
                    position.line += (direction === "previous") ? -Number(distance) : +Number(distance);
                }
                if (position.line < 0) {
                    position.line = 0;
                    position.column = 0;
                }
                else if (position.line > this._textBuffer.getLines() - 1) {
                    position.line = this._textBuffer.getLines() - 1;
                    position.column = this._textBuffer.getColumns(position.line);
                }
            }
            // switch back to selection units with tabs expanded
            position = this.toScreenPosition(position);
            var textRange = (select) ?
                new Textor.TextRange(new Textor.TextPosition(this._textRange.start.line, this._textRange.start.column), position) :
                new Textor.TextRange(position, position);
            this._undoService.begin();
            this._undoService.add(new Textor.SelectionUndoUnit(this, textRange));
            this._undoService.commit();
        };
        TextModel.prototype.insertText = function (text) {
            this._undoService.begin();
            this._undoService.add(new Textor.TextUndoUnit(this, this._textBuffer, this.toBufferRange(this.getTextRange()), text));
            this._undoService.commit();
        };
        TextModel.prototype.deleteSelection = function (position) {
            if (!this.isCursor() || (position === null)) {
                this.insertText("");
            }
            else {
                var textRange = this.toBufferRange(this.getTextRange());
                if (position === "previous") {
                    textRange.start.column--;
                    if (textRange.start.column < 0) {
                        textRange.start.line--;
                        if (textRange.start.line < 0) {
                            textRange.start.line = 0;
                            textRange.start.column = 0;
                        }
                        else {
                            textRange.start.column = this._textBuffer.getColumns(textRange.start.line);
                        }
                    }
                }
                else if (position === "next") {
                    textRange.end.column++;
                    if (textRange.end.column > this._textBuffer.getColumns(textRange.end.line)) {
                        textRange.end.line++;
                        if (textRange.end.line > this._textBuffer.getLines() - 1) {
                            textRange.end.line = this._textBuffer.getLines() - 1;
                            textRange.end.column = this._textBuffer.getColumns(textRange.end.line);
                        }
                        else {
                            textRange.end.column = 0;
                        }
                    }
                }
                this._undoService.begin();
                this._undoService.add(new Textor.TextUndoUnit(this, this._textBuffer, textRange, ""));
                this._undoService.commit();
            }
        };
        TextModel.prototype.getTextRange = function () {
            // return valid range with tabs expanded
            if (this.isCursor()) {
                var line = this._textRange.start.line;
                var column = this._textRange.start.column;
                if (line >= this._textBuffer.getLines()) {
                    line = this._textBuffer.getLines() - 1;
                    column = this.getColumns(line);
                }
                else if (column > this.getColumns(line)) {
                    column = this.getColumns(line);
                }
                return new Textor.TextRange(new Textor.TextPosition(line, column), new Textor.TextPosition(line, column));
            }
            var textRange = this._textRange.clone();
            if (textRange.start.line >= this._textBuffer.getLines()) {
                textRange.start.line = this._textBuffer.getLines() - 1;
                textRange.start.column = this.getColumns(textRange.start.line);
            }
            if (textRange.end.line >= this._textBuffer.getLines()) {
                textRange.end.line = this._textBuffer.getLines() - 1;
                textRange.end.column = this.getColumns(textRange.end.line);
            }
            if (textRange.start.column > this.getColumns(textRange.start.line)) {
                textRange.start = new Textor.TextPosition(textRange.start.line, this.getColumns(textRange.start.line));
            }
            if (textRange.end.column > this.getColumns(textRange.end.line)) {
                textRange.end = new Textor.TextPosition(textRange.end.line, this.getColumns(textRange.end.line));
            }
            return textRange.normalize();
        };
        TextModel.prototype.isCursor = function () {
            return this._textRange.isEmpty;
        };
        Object.defineProperty(TextModel.prototype, "tabSize", {
            get: function () {
                return this._tabSize;
            },
            set: function (value) {
                this._tabSize = value;
                this._tabText = "";
                for (var i = 0; i < this._tabSize; i++) {
                    this._tabText += " ";
                }
            },
            enumerable: true,
            configurable: true
        });
        TextModel.prototype.getColumns = function (line) {
            return this.getTabLength(this._textBuffer.getLine(line));
        };
        TextModel.prototype.getTabLength = function (text) {
            var tabLength = 0;
            var bufferLength = text.length;
            for (var i = 0; i < bufferLength; i++) {
                tabLength += (text[i] === "\t") ? this._tabSize : 1;
            }
            return tabLength;
        };
        TextModel.prototype.toScreenPosition = function (textPosition) {
            // transform from text buffer position to selection position.
            var text = this._textBuffer.getLine(textPosition.line).substring(0, textPosition.column);
            var length = this.getTabLength(text) - text.length;
            return new Textor.TextPosition(textPosition.line, textPosition.column + length);
        };
        TextModel.prototype.toBufferPosition = function (textPosition) {
            // transform from selection position to text buffer position.
            var text = this._textBuffer.getLine(textPosition.line);
            var column = 0;
            for (var i = 0; i < text.length; i++) {
                column += (text[i] === "\t") ? this._tabSize : 1;
                if (column > textPosition.column) {
                    return new Textor.TextPosition(textPosition.line, i);
                }
            }
            return new Textor.TextPosition(textPosition.line, text.length);
        };
        TextModel.prototype.toScreenRange = function (textRange) {
            return new Textor.TextRange(this.toScreenPosition(textRange.start), this.toScreenPosition(textRange.end));
        };
        TextModel.prototype.toBufferRange = function (textRange) {
            return new Textor.TextRange(this.toBufferPosition(textRange.start), this.toBufferPosition(textRange.end));
        };
        TextModel.prototype.getIndent = function () {
            var textRange = this.getTextRange();
            if (textRange.isEmpty) {
                var text = this._textBuffer.getLine(textRange.end.line);
                var index = 0;
                while ((index < text.length) && (text[index] === "\t" || text[index] === " ")) {
                    index++;
                }
                text = text.substring(0, index);
                if (textRange.end.column >= this.getTabLength(text)) {
                    return text;
                }
            }
            return "";
        };
        TextModel.prototype.findWordBreak = function (text, startIndex, increment) {
            if (increment < 0) {
                startIndex += increment;
            }
            var startState = this.isWordSeparator(text[startIndex]);
            for (var i = startIndex; (i >= 0) && (i < text.length); i += increment) {
                if (this.isWordSeparator(text[i]) !== startState) {
                    return (increment < 0) ? (i -= increment) : i;
                }
            }
            return (increment < 0) ? 0 : text.length;
        };
        TextModel.prototype.isWordSeparator = function (character) {
            return ' \t\'",;.!~@#$%^&*?=<>()[]:\\+-'.indexOf(character) !== -1;
        };
        TextModel.prototype.onSelectionChanged = function (e) {
            for (var _i = 0, _a = this._selectionChangedHandlers; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(e);
            }
        };
        return TextModel;
    }());
    Textor.TextModel = TextModel;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextPosition = /** @class */ (function () {
        function TextPosition(line, column) {
            this.line = line;
            this.column = column;
        }
        TextPosition.prototype.equals = function (position) {
            return ((this.line === position.line) && (this.column === position.column));
        };
        TextPosition.prototype.compareTo = function (position) {
            var line = this.line - position.line;
            return (line === 0) ? (this.column - position.column) : line;
        };
        TextPosition.prototype.clone = function () {
            return new TextPosition(this.line, this.column);
        };
        TextPosition.prototype.toString = function () {
            return "(" + this.line + "," + this.column + ")";
        };
        return TextPosition;
    }());
    Textor.TextPosition = TextPosition;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextRange = /** @class */ (function () {
        function TextRange(start, end) {
            this.start = start;
            this.end = end;
        }
        Object.defineProperty(TextRange.prototype, "isEmpty", {
            get: function () {
                return ((this.start.line === this.end.line) && (this.start.column === this.end.column));
            },
            enumerable: true,
            configurable: true
        });
        TextRange.prototype.normalize = function () {
            return (this.start.compareTo(this.end) > 0) ? new TextRange(this.end.clone(), this.start.clone()) : this.clone();
        };
        TextRange.prototype.clone = function () {
            return new TextRange(this.start.clone(), this.end.clone());
        };
        TextRange.prototype.toString = function () {
            return this.start.toString() + "-" + this.end.toString();
        };
        return TextRange;
    }());
    Textor.TextRange = TextRange;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextReader = /** @class */ (function () {
        function TextReader(textBuffer) {
            this._textPosition = new Textor.TextPosition(0, 0);
            this._textBuffer = textBuffer;
            this.save();
        }
        Object.defineProperty(TextReader.prototype, "textPosition", {
            get: function () {
                return this._textPosition;
            },
            enumerable: true,
            configurable: true
        });
        TextReader.prototype.peek = function () {
            if (this._textPosition.line < this._textBuffer.getLines()) {
                var text = this._textBuffer.getLine(this._textPosition.line);
                return (this._textPosition.column >= text.length) ? "\n" : text[this._textPosition.column];
            }
            return "";
        };
        TextReader.prototype.read = function () {
            if (this._textPosition.line < this._textBuffer.getLines()) {
                var text = this._textBuffer.getLine(this._textPosition.line);
                var c = (this._textPosition.column >= text.length) ? "\n" : text[this._textPosition.column];
                this._textPosition.column++;
                if (this._textPosition.column > text.length) {
                    this._textPosition.column = 0;
                    this._textPosition.line++;
                }
                return c;
            }
            return "";
        };
        TextReader.prototype.match = function (text) {
            var line = this._textPosition.line;
            var column = this._textPosition.column;
            var index = 0;
            while (index < text.length) {
                var c = this.read();
                if ((c.length === 0) || (c !== text[index])) {
                    this._textPosition.line = line;
                    this._textPosition.column = column;
                    return false;
                }
                index++;
            }
            return true;
        };
        TextReader.prototype.skipWhitespaces = function () {
            var character;
            var skipped = false;
            while (((character = this.peek()).length > 0) && this.isWhitespace(character)) {
                this.read();
                skipped = true;
            }
            return skipped;
        };
        TextReader.prototype.skipLineTerminators = function () {
            var character;
            var skipped = false;
            while (((character = this.peek()).length > 0)) {
                if (character === "\n") {
                    this.read();
                    if (this.peek() === "\r") {
                        this.read();
                    }
                    skipped = true;
                    continue;
                }
                else if (character === "\r" || character === "\u2028" || character === "\u2029") {
                    this.read();
                    skipped = true;
                    continue;
                }
                break;
            }
            return skipped;
        };
        TextReader.prototype.save = function () {
            this._lastLine = this._textPosition.line;
            this._lastColumn = this._textPosition.column;
        };
        TextReader.prototype.restore = function () {
            this._textPosition.line = this._lastLine;
            this._textPosition.column = this._lastColumn;
        };
        TextReader.prototype.isWhitespace = function (character) {
            return (character === " " || character === "\t" || character === "\u00A0");
        };
        return TextReader;
    }());
    Textor.TextReader = TextReader;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var TextUndoUnit = /** @class */ (function () {
        function TextUndoUnit(textModel, textBuffer, textRange, text) {
            this._redoSelection = null;
            this._undoRange = null;
            this._textModel = textModel;
            this._textBuffer = textBuffer;
            this._redoRange = textRange;
            this._redoText = text;
            this._undoText = textBuffer.getText(textRange);
            this._undoSelection = textModel.getTextRange();
        }
        TextUndoUnit.prototype.undo = function () {
            this._textBuffer.setText(this._undoRange, this._undoText);
            this._textModel.selectRange(this._undoSelection);
        };
        TextUndoUnit.prototype.redo = function () {
            this._undoRange = this._textBuffer.setText(this._redoRange, this._redoText);
            if (this._redoSelection === null) {
                var position = this._textModel.toScreenPosition(this._undoRange.end);
                this._redoSelection = new Textor.TextRange(position.clone(), position.clone());
            }
            this._textModel.selectRange(this._redoSelection);
        };
        Object.defineProperty(TextUndoUnit.prototype, "isEmpty", {
            get: function () {
                return false;
            },
            enumerable: true,
            configurable: true
        });
        TextUndoUnit.prototype.merge = function (undoUnit) {
            if (undoUnit instanceof Textor.SelectionUndoUnit) {
                var selectionUndoUnit = undoUnit;
                this._redoSelection = selectionUndoUnit.redoTextRange;
                return true;
            }
            return false;
        };
        TextUndoUnit.prototype.toString = function () {
            return "Text: " +
                this._undoRange.toString() + " => " + this._redoRange.toString() + " | \'" +
                this._undoText.replace(/\t/g, "\\t") + "' => '" + this._redoText.replace(/\t/g, "\\t") + "' | " +
                this._undoSelection.toString() + " => " + this._redoSelection.toString();
        };
        return TextUndoUnit;
    }());
    Textor.TextUndoUnit = TextUndoUnit;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var ThemeManager = /** @class */ (function () {
        function ThemeManager() {
            this._themes = {};
            this.add("default", {
                attributeStyle: "#0000AA italic",
                backgroundBlurColor: "#ffffff",
                backgroundColor: "#ffffff",
                commentStyle: "#0068c5 italic",
                cursorBackgroundColor: "#ededed",
                cursorColor: "#000000",
                declarationStyle: "#000000 bold",
                elementStyle: "#0000AA bold",
                errorStyle: "#FF0000 bold",
                fontFamily: "Menlo,Consolas,Courier New",
                fontSize: "13",
                keywordStyle: "#662266 bold",
                literalStyle: "#005a15",
                paddingLeft: "4",
                paddingTop: "4",
                punctuationStyle: "#666666",
                selectionBlurColor: "#e3f1fe",
                selectionColor: "#c0ddf6",
                textStyle: "#000000",
            });
            this.add("dark", {
                attributeStyle: "#CCCCCC italic",
                backgroundBlurColor: "#000000",
                backgroundColor: "#22252A",
                commentStyle: "#AAAAAA italic",
                cursorBackgroundColor: "#33373F",
                cursorColor: "#FFFFFF",
                declarationStyle: "#FFFFFF italic",
                elementStyle: "#CCCCCC bold",
                errorStyle: "AA0000 bold",
                fontFamily: "Menlo,Consolas,Courier New",
                fontSize: "13",
                keywordStyle: "#82A0C0",
                literalStyle: "#997777",
                paddingLeft: "4",
                paddingTop: "4",
                punctuationStyle: "#888888",
                selectionBlurColor: "#33373F",
                selectionColor: "#3C424C",
                textStyle: "#FFFFFF",
            });
            this.add("gray", {
                attributeStyle: "#AAAAAA bold",
                backgroundBlurColor: "#000000",
                backgroundColor: "#202020",
                commentStyle: "#AAAAAA italic",
                cursorBackgroundColor: "#333333",
                cursorColor: "#FFFFFF",
                declarationStyle: "#FFFFFF italic",
                elementStyle: "#CCCCCC bold",
                errorStyle: "#AA0000 bold",
                fontFamily: "Menlo,Consolas,Courier New",
                fontSize: "13",
                keywordStyle: "#808880 bold",
                literalStyle: "#998888",
                paddingLeft: "4",
                paddingTop: "4",
                punctuationStyle: "#888888",
                selectionBlurColor: "#282828",
                selectionColor: "#383838",
                textStyle: "#FFFFFF",
            });
        }
        ThemeManager.prototype.add = function (name, theme) {
            this._themes[name] = theme;
        };
        ThemeManager.prototype.remove = function (name) {
            delete this._themes[name];
        };
        ThemeManager.prototype.get = function (name) {
            return this._themes[name];
        };
        return ThemeManager;
    }());
    Textor.ThemeManager = ThemeManager;
})(Textor || (Textor = {}));
var Textor;
(function (Textor) {
    var UndoService = /** @class */ (function () {
        function UndoService() {
            this._container = null;
            this._stack = [];
            this._position = 0;
        }
        UndoService.prototype.begin = function () {
            this._container = new Textor.ContainerUndoUnit();
        };
        UndoService.prototype.cancel = function () {
            this._container = null;
        };
        UndoService.prototype.commit = function () {
            if (!this._container.isEmpty) {
                this._stack.splice(this._position, this._stack.length - this._position);
                this._stack.push(this._container);
                this.redo();
                // try to merge all undo units in last container
                var c1 = this._stack[this._stack.length - 1];
                for (var i = c1.undoUnits.length - 1; i > 0; i--) {
                    if (!c1.undoUnits[i - 1].merge(c1.undoUnits[i])) {
                        break;
                    }
                    c1.undoUnits.splice(i, 1);
                }
                if (this._stack.length > 1) {
                    // try to merge last container with only one undo unit with last undo unit in previous container
                    var c2 = this._stack[this._stack.length - 2];
                    if ((c1.undoUnits.length === 1) && (c2.undoUnits.length > 0) &&
                        (c2.undoUnits[c2.undoUnits.length - 1].merge(c1.undoUnits[0]))) {
                        this._stack.splice(this._stack.length - 1, 1);
                        this._position--;
                    }
                }
            }
            this._container = null;
        };
        UndoService.prototype.add = function (undoUnit) {
            this._container.add(undoUnit);
        };
        UndoService.prototype.clear = function () {
            this._stack = [];
            this._position = 0;
        };
        UndoService.prototype.undo = function () {
            if (this._position !== 0) {
                this._position--;
                this._stack[this._position].undo();
            }
        };
        UndoService.prototype.redo = function () {
            if ((this._stack.length !== 0) && (this._position < this._stack.length)) {
                this._stack[this._position].redo();
                this._position++;
            }
        };
        UndoService.prototype.toString = function () {
            var text = "";
            for (var _i = 0, _a = this._stack; _i < _a.length; _i++) {
                var item = _a[_i];
                text += item.toString();
            }
            return text;
        };
        return UndoService;
    }());
    Textor.UndoService = UndoService;
})(Textor || (Textor = {}));
//# sourceMappingURL=texteditor.js.map