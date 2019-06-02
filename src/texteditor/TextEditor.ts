namespace Textor {

    export class TextEditor {

        public set theme(value: ITheme) {
            for (const propertyName of Object.keys(value)) {
                this._theme[propertyName] = value[propertyName];
                if (propertyName === "fontFamily" || propertyName === "fontSize") {
                    this.updateFont();
                }
            }
            this.invalidate();
            this.update();
        }

        public get theme(): ITheme {
            return this._theme;
        }

        public get themeManager(): IThemeManager {
            return this._themeManager;
        }

        public get language(): ILanguage {
            return this._languageService.language;
        }

        public set language(value: ILanguage) {
            this._languageService.language = value;
        }

        public get tabSize(): number {
            return this._textModel.tabSize;
        }

        public set tabSize(value: number) {
            this._textModel.tabSize = value;
            this.invalidate();
            this.update();
        }

        public set text(value: string) {
            this._undoService.begin();
            this._undoService.add(new TextUndoUnit(this._textModel,
                this._textBuffer, this._textBuffer.getTextRange(), value));
            this._undoService.add(new SelectionUndoUnit(this._textModel,
                new TextRange(new TextPosition(0, 0), new TextPosition(0, 0))));
            this._undoService.commit();
            this._undoService.clear();
            this.update();
        }

        public get text(): string {
            return this._textBuffer.getText(this._textBuffer.getTextRange());
        }

        public get scrollPosition(): TextPosition {
            return this._scrollPosition;
        }

        public get fontSize(): Size {
            return this._fontSize;
        }

        public get size(): TextPosition {
            return this.getTextPosition(new Point(this._canvas.width, this._canvas.height));
        }

        public get devicePixelRatio(): number {
            if (("devicePixelRatio" in window) && (window.devicePixelRatio > 1)) {
                return window.devicePixelRatio;
            }
            if (("deviceXDPI" in window.screen) && ("logicalXDPI" in window.screen)) {
                return window.screen.deviceXDPI / window.screen.logicalXDPI;
            }
            return 1;
        }

        private _canvas: HTMLCanvasElement;
        private _context: CanvasRenderingContext2D;
        private _theme: ITheme;
        private _themeManager: IThemeManager;
        private _undoService: UndoService = new UndoService();
        private _textChangingHandlers: TextChangeHandler[] = [];
        private _textChangedHandlers: TextChangeHandler[] = [];
        private _selectionChangedHandlers: SelectionChangeHandler[] = [];
        private _textBuffer: TextBuffer;
        private _textModel: TextModel;
        private _textController: TextController;
        private _scrollPosition: TextPosition = new TextPosition(0, 0);
        private _languageService: LanguageService;
        private _invalidRectangles: Rectangle[] = [];
        private _maxColumns: number = -1;
        private _blinkTimer: number;
        private _blinkTimerEnabled: boolean = false;
        private _blinkState: boolean = true;
        private _fontSize: Size;
        private _textBuffer_textChanging: (e: TextChangeEvent) => void;
        private _textBuffer_textChanged: (e: TextChangeEvent) => void;
        private _textModel_selectionChanged: (e: SelectionChangeEvent) => void;

        constructor(canvas: HTMLCanvasElement) {
            this._canvas = canvas;
            this._context = canvas.getContext("2d");

            this._textBuffer_textChanging = (e: TextChangeEvent) => { this.textBuffer_textChanging(e); };
            this._textBuffer_textChanged = (e: TextChangeEvent) => { this.textBuffer_textChanged(e); };
            this._textModel_selectionChanged = (e: SelectionChangeEvent) => { this.textModel_selectionChanged(e); };

            this._textBuffer = new TextBuffer();
            this._textBuffer.addEventListener("textchanging", this._textBuffer_textChanging);
            this._textBuffer.addEventListener("textchanged", this._textBuffer_textChanged);

            this._textModel = new TextModel(this._undoService, this._textBuffer);
            this._textModel.addEventListener("selectionchanged", this._textModel_selectionChanged);
            this._textModel.tabSize = 4;

            this._textController = new TextController(this, this._canvas);

            this._languageService = new LanguageService(this);

            this._themeManager = new ThemeManager();
            this._theme = this._themeManager.get("default");

            this.updateSize(this._canvas.clientWidth, this._canvas.clientHeight);
            this.focus();
        }

        public dispose() {
            this._textController.dispose();
            this._textController = null;
            this._textModel.removeEventListener("selectionchanged", this._textModel_selectionChanged);
            this._textBuffer.removeEventListener("textchanging", this._textBuffer_textChanging);
            this._textBuffer.removeEventListener("textchanged", this._textBuffer_textChanged);
            this._textChangedHandlers = [];
            this._selectionChangedHandlers = [];
        }

        public addEventListener(type: string, callback: (e) => void) {
            switch (type) {
                case "textchanging": this._textChangingHandlers.push(callback); break;
                case "textchanged":  this._textChangedHandlers.push(callback); break;
                case "selectionchanged":  this._selectionChangedHandlers.push(callback); break;
            }
        }

        public removeEventListener(type: string, callback: (e) => void) {
            switch (type) {
                case "textchanging": this._textChangingHandlers = this._textChangingHandlers.filter((item) => item !== callback); break;
                case "textchanged":  this._textChangedHandlers = this._textChangedHandlers.filter((item) => item !== callback); break;
                case "selectionchanged":  this._selectionChangedHandlers = this._selectionChangedHandlers.filter((item) => item !== callback); break;
            }
        }

        public focus() {
            this._textController.focus();
        }

        public insertText(text: string) {
            this._textModel.insertText(text);
        }

        public deleteSelection() {
            this._textModel.deleteSelection(null);
        }

        public select(line: number, column: number) {
            if (line > (this._textBuffer.getLines() - 1)) {
                line = this._textBuffer.getLines() - 1;
                if (column > (this._textBuffer.getColumns(line) - 1)) {
                    column = this._textBuffer.getColumns(line) - 1;
                }
            }

            const textPosition: TextPosition = new TextPosition(line, column);
            const startPosition: TextPosition = this._textModel.toScreenPosition(
                this._textModel.toBufferPosition(textPosition));
            const endPosition: TextPosition = this._textModel.toScreenPosition(
                this._textModel.toBufferPosition(textPosition));

            this._undoService.begin();
            this._undoService.add(new SelectionUndoUnit(this._textModel, new TextRange(startPosition, endPosition)));
            this._undoService.commit();
            this.updateScrollPosition();
            this.update();
        }

        public selectRange(startLine: number, startColumn: number, endLine: number, endColumn: number) {
            this._undoService.begin();
            this._undoService.add(new SelectionUndoUnit(this._textModel,
                new TextRange(new TextPosition(startLine, startColumn), new TextPosition(endLine, endColumn))));
            this._undoService.commit();
            this.updateScrollPosition();
            this.update();
        }

        public selectAll() {
            this._undoService.begin();
            this._undoService.add(new SelectionUndoUnit(this._textModel,
                this._textModel.toScreenRange(this._textBuffer.getTextRange())));
            this._undoService.commit();
            this.update();
        }

        public selectTo(line: number, column: number) {
            let textPosition: TextPosition = new TextPosition(line, column);
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
                this._undoService.add(new SelectionUndoUnit(this._textModel,
                    new TextRange(this._textModel.textRange.start.clone(), textPosition)));
                this._undoService.commit();
                this.updateScrollPosition();
                this.update();
            }
        }

        public selectWord(line: number, column: number) {
            const textPosition: TextPosition = this._textModel.toBufferPosition(new TextPosition(line, column));
            const text: string = this._textBuffer.getLine(textPosition.line);
            const startColumn: number = this._textModel.findWordBreak(text, textPosition.column + 1, -1);
            const endColumn: number = this._textModel.findWordBreak(text, textPosition.column, 1);
            const textRange: TextRange = new TextRange(new TextPosition(textPosition.line, startColumn),
                new TextPosition(textPosition.line, endColumn));

            this._undoService.begin();
            this._undoService.add(new SelectionUndoUnit(this._textModel, this._textModel.toScreenRange(textRange)));
            this._undoService.commit();
            this.update();
        }

        public scroll(vertical: number, horizontal: number) {
            this._scrollPosition.line += vertical;
            this._scrollPosition.column += horizontal;
            const size: TextPosition = this.size;
            const maxLine =
                ((this._textBuffer.getLines() - size.line) < 0) ? 0 : this._textBuffer.getLines() - size.line;
            const maxColumn =
                ((this.getMaxColumns() - size.column + 1) < 0) ? 0 : this.getMaxColumns() - size.column + 1;
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
        }

        public undo() {
            this._undoService.undo();
            this.updateScrollPosition();
            this.update();
        }

        public redo() {
            this._undoService.redo();
            this.updateScrollPosition();
            this.update();
        }

        public cut() {
            this.copy();
            this.deleteSelection();
            this.updateScrollPosition();
            this.update();
        }

        public copy() {
            const textRange: TextRange = this._textModel.toBufferRange(this._textModel.getTextRange());
            if (!textRange.isEmpty) {
                const text: string = this._textBuffer.getText(textRange);

                if (window.clipboardData && window.clipboardData.getData) {
                    window.clipboardData.setData("Text", text); // IE
                } else {
                    this._textController.copy(text);
                }
            }
        }

        public paste(text: string) {
            if (text) {
                this.insertText(text);
                this.updateScrollPosition();
                this.update();
            }
        }

        public createTextReader(): TextReader {
            return new TextReader(this._textBuffer);
        }

        public processKey(keyCode: number, shiftKey: boolean, ctrlKey: boolean, altKey: boolean, metaKey: boolean) {
            if ((ctrlKey || metaKey) && !altKey) {
                if (keyCode === 65) {
                    this.selectAll();
                    return true;
                } else if (keyCode === 88) {
                    if (window.clipboardData && window.clipboardData.setData) {
                        this.cut();
                        return true;
                    }
                } else if (keyCode === 67) {
                    if (window.clipboardData && window.clipboardData.setData) {
                        this.copy();
                        return true;
                    }
                } else if (keyCode === 86) {
                    if (window.clipboardData && window.clipboardData.getData) {
                        const text = window.clipboardData.getData("Text");
                        if (text) {
                            this.paste(text);
                            return true;
                        }
                    }
                } else if ((keyCode === 90) && (!shiftKey)) {
                    this.undo();
                    return true;
                } else if (((keyCode === 90) && (shiftKey)) || (keyCode === 89)) {
                    this.redo();
                    return true;
                }
            }

            if (!metaKey && !altKey) {
                if (keyCode === 37) {
                    this._textModel.moveCursor("column", !ctrlKey ? "1" : "word", "previous", shiftKey);
                    this.updateScrollPosition();
                    return true;
                } else if (keyCode === 39) {
                    this._textModel.moveCursor("column", !ctrlKey ? "1" : "word", "next", shiftKey);
                    this.updateScrollPosition();
                    return true;
                } else if (keyCode === 38) {
                    if (!ctrlKey) {
                        this._textModel.moveCursor("line", "1", "previous", shiftKey);
                        this.updateScrollPosition();
                    } else {
                        this.scroll(-1, 0);
                    }
                    return true;
                } else if (keyCode === 40) {
                    if (!ctrlKey) {
                        this._textModel.moveCursor("line", "1", "next", shiftKey);
                        this.updateScrollPosition();
                    } else {
                        this.scroll(+1, 0);
                    }
                    return true;
                } else if (!ctrlKey) {
                    if (keyCode === 8) {
                        this._textModel.deleteSelection("previous");
                        this.updateScrollPosition();
                        return true;
                    } else if (keyCode === 9) {
                        this.insertText("\t");
                        this.updateScrollPosition();
                        return true;
                    } else if (keyCode === 13) {
                        this.insertText("\n" + this._textModel.getIndent());
                        this.updateScrollPosition();
                        return true;
                    } else if (keyCode === 45) {
                        this._textModel.insertText(" ");
                        this.updateScrollPosition();
                        return true;
                    } else if (keyCode === 46) {
                        this._textModel.deleteSelection("next");
                        this.updateScrollPosition();
                        return true;
                    } else if (keyCode === 32) {
                        this.insertText(" ");
                        this.updateScrollPosition();
                        return true;
                    } else if (keyCode === 33) {
                        if (shiftKey) {
                            this._textModel.moveCursor("line", this.size.line.toString(), "previous", shiftKey);
                            this.updateScrollPosition();
                        } else {
                            this.scroll(-this.size.line, 0);
                        }
                        return true;
                    } else if (keyCode === 34) {
                        if (shiftKey) {
                            this._textModel.moveCursor("line", this.size.line.toString(), "next", shiftKey);
                            this.updateScrollPosition();
                        } else {
                            this.scroll(+this.size.line, 0);
                        }
                        return true;
                    } else if (keyCode === 35) {
                        this._textModel.moveCursor("column", "boundary", "next", shiftKey);
                        this.updateScrollPosition();
                        return true;
                    } else if (keyCode === 36) {
                        this._textModel.moveCursor("column", "boundary", "previous", shiftKey);
                        this.updateScrollPosition();
                        return true;
                    }
                }
            }
        }

        public updateScrollPosition() {
            const size: TextPosition = this.size;
            size.line--;
            size.column--;

            const textRange = this._textModel.textRange;
            const selection = textRange.end.clone();
            if (selection.line > this._textBuffer.getLines() - 1) {
                selection.line = this._textBuffer.getLines() - 1;
            }
            const maxPosition = this._textModel.toScreenPosition(
                new TextPosition(selection.line, this._textBuffer.getColumns(selection.line)));
            if (selection.column > maxPosition.column - 1) {
                selection.column = maxPosition.column - 1;
            }
            selection.line -= this._scrollPosition.line;
            selection.column -= this._scrollPosition.column;

            let vertical = 0;
            let horizontal = 0;

            if (selection.line < 0) {
                vertical = selection.line;
            } else if (selection.line > size.line) {
                vertical = selection.line - size.line;
            }

            if (selection.column < 5) {
                // scroll left with a 5 character margin
                horizontal = selection.column - 5;
                if (this._scrollPosition.column + horizontal < 0) {
                    horizontal = -this._scrollPosition.column;
                }
            } else if (selection.column > (size.column - 5)) {
                // scroll right with a 5 character margin
                horizontal = selection.column - size.column + 5;

                const maxColumns = this.getMaxColumns();
                if (this._scrollPosition.column + horizontal + size.column > maxColumns + 1) {
                    horizontal = maxColumns - size.column - this._scrollPosition.column + 1;
                }
            }

            if ((horizontal !== 0) || (vertical !== 0)) {
                this.scroll(vertical, horizontal);
            }
        }

        public updateSize(width: number, height: number) {
            this._canvas.style.width = width.toString();
            this._canvas.style.height = height.toString();
            this._canvas.width = width * this.devicePixelRatio;
            this._canvas.height = height * this.devicePixelRatio;

            this.updateFont();
            this.invalidate();
            this.update();
        }

        public getTextPosition(point: Point): TextPosition {
            const paddingLeft: number = parseFloat(this._theme.paddingLeft);
            const paddingTop: number = parseFloat(this._theme.paddingTop);
            const column: number = Math.floor((point.x - paddingLeft) / this.fontSize.width);
            const line: number = Math.floor((point.y - paddingTop) / this.fontSize.height);
            return new TextPosition(line, column);
        }

        public invalidate() {
            this.invalidateRectangle(new Rectangle(0, 0, this._canvas.width, this._canvas.height));
        }

        public invalidateRange(textRange: TextRange) {
            const fontSize: Size = this.fontSize;
            const paddingLeft: number = parseFloat(this._theme.paddingLeft);
            const paddingTop: number = parseFloat(this._theme.paddingTop);

            const range = textRange.normalize();
            range.start.line -= this._scrollPosition.line;
            range.end.line -= this._scrollPosition.line;
            range.start.column -= this._scrollPosition.column;
            range.end.column -= this._scrollPosition.column;

            let x = paddingLeft;
            const y = paddingTop + (range.start.line * fontSize.height);

            if (textRange.start.line === textRange.end.line) {
                x += range.start.column * fontSize.width;
                const width: number = (range.end.column - range.start.column) *  fontSize.width;
                this.invalidateRectangle(new Rectangle(x, y , width, fontSize.height));
            } else {
                const height: number = (range.end.line - range.start.line + 1) * fontSize.height;
                this.invalidateRectangle(new Rectangle(x, y, this._canvas.width, height));
            }
        }

        public update() {
            if (this._invalidRectangles.length !== 0) {
                // merge invalid rectangles to a single clip rectangle
                let clipRectangle: Rectangle = this._invalidRectangles[0];
                for (let i = 1; i < this._invalidRectangles.length; i++) {
                    clipRectangle = clipRectangle.union(this._invalidRectangles[i]);
                }
                if ((clipRectangle.width !== 0) && (clipRectangle.height !== 0)) {
                    this._context.save();

                    // apply clip rectangle
                    this._context.beginPath();
                    this._context.rect(clipRectangle.x, clipRectangle.y, clipRectangle.width, clipRectangle.height);
                    this._context.clip();

                    const focused: boolean = this._textController.isFocused();

                    // erase background
                    this._context.fillStyle = focused ? this._theme.backgroundColor : this._theme.backgroundBlurColor;
                    this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);

                    const size: TextPosition = this.size;
                    const fontSize: Size = this.fontSize;
                    const paddingLeft: number = parseFloat(this._theme.paddingLeft);
                    const paddingTop: number = parseFloat(this._theme.paddingTop);

                    const selection: TextRange = this._textModel.getTextRange();
                    selection.start.line -= this._scrollPosition.line;
                    selection.end.line -= this._scrollPosition.line;
                    selection.start.column -= this._scrollPosition.column;
                    selection.end.column -= this._scrollPosition.column;
                    if (this._textModel.isCursor()) {
                        // draw selected line
                        this._context.fillStyle = this._theme.cursorBackgroundColor;
                        const y = (selection.start.line * fontSize.height) + paddingTop;
                        this._context.fillRect(0, y, this._canvas.width, fontSize.height);

                        if (this._blinkState && this._textController.isFocused()) {
                            // draw insertion point
                            this._context.fillStyle = this._theme.cursorColor;
                            this._context.fillRect(paddingLeft + (selection.start.column * fontSize.width), y, 1, fontSize.height);
                        }
                    } else {
                        // draw selection
                        this._context.fillStyle = focused ? this._theme.selectionColor : this._theme.selectionBlurColor;
                        let y = 0;
                        for (let line = 0; line < size.line; line++) {
                            let x = 0;
                            let width = this._canvas.width;
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
                    const stylesTable = { text: true };
                    const styles = [ "text" ];
                    const font = this._context.font;
                    this._context.shadowOffsetX = 0;
                    this._context.shadowOffsetY = 0;
                    for (let i = 0; i < styles.length; i++) {
                        // apply style
                        const currentStyle = styles[i];
                        const theme: string = this._theme[currentStyle + "Style"];
                        const themeProperties: string[] = theme.split(" ");
                        this._context.fillStyle = themeProperties[0];
                        this._context.font = ((themeProperties.length === 2) &&
                            (themeProperties[1] === "italic")) ? ("italic " + font) : font;
                        this._context.font = ((themeProperties.length === 2) &&
                            (themeProperties[1] === "bold")) ? ("bold " + font) : font;

                        let y = Math.floor(fontSize.height * 0.8) + paddingTop;
                        for (let line = this._scrollPosition.line; line < (this._scrollPosition.line + size.line); line++) {
                            if (line < this._textBuffer.getLines()) {
                                const text: string = this._textBuffer.getLine(line);
                                const syntax: LanguageStyle[] = this._languageService.getStyles(line);
                                let index: number = 0;
                                let style: string = "text";
                                // var state = null;
                                let column: number = 0;
                                let position: number = 0;
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
                                    const length = (index < syntax.length) ? (syntax[index].start - position) : (text.length - position);
                                    let part = "";
                                    for (let n: number = position; n < position + length; n++) {
                                        part += (text[n] !== "\t") ? text[n] : this._textModel.tabText;
                                    }
                                    if ((currentStyle === style) && ((column - this._scrollPosition.column + part.length) > 0) && ((column - this._scrollPosition.column) < size.column)) {
                                        this._context.fillText(part, (column - this._scrollPosition.column) * fontSize.width + paddingLeft, y);
                                    }
                                    position += length;
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
        }

        private updateFont() {
            const fontSize: number = parseFloat(this._theme.fontSize) * this.devicePixelRatio;
            this._context.font = fontSize + "px " + this._theme.fontFamily;
            const width = this._context.measureText("XXXXXXXXXXXXXXXXXXXX").width / 20;
            const height = Math.floor(fontSize * 1.5);
            this._fontSize = new Size(width, height);
        }

        private getMaxColumns(): number {
            // find the longest line in the buffer.
            if (this._maxColumns === -1) {
                // TODO can this be optimized to update incrementatlly?
                for (let line = 0; line < this._textBuffer.getLines(); line++) {
                    const length = this._textModel.getColumns(line);
                    if (this._maxColumns < length) {
                        this._maxColumns = length;
                    }
                }
            }
            return this._maxColumns;
        }

        private invalidateSelection(textRange: TextRange) {
            this.invalidateRange(textRange);

            // invalidate current line including padding area
            const paddingLeft: number = parseFloat(this._theme.paddingLeft);
            const paddingTop: number = parseFloat(this._theme.paddingTop);
            const fontSize = this.fontSize;
            const rectangle = new Rectangle(0,
                ((textRange.end.line - this._scrollPosition.line) * fontSize.height) + paddingTop,
                this._canvas.width, fontSize.height);
            this.invalidateRectangle(rectangle);
        }

        private invalidateRectangle(rectangle: Rectangle) {
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
        }

        private textBuffer_textChanging(e: TextChangeEvent) {
            // invalidate old range
            const textRange: TextRange = this._textModel.toScreenRange(e.oldRange.normalize());
            textRange.end.column = this.size.column + this._scrollPosition.column;
            if (textRange.start.line !== textRange.end.line) {
                textRange.end.line = this.size.line + this._scrollPosition.line;
            }
            this.invalidateRange(textRange);

            // propagate the event to client code
            this.onTextChanging(e);
        }

        private textBuffer_textChanged(e: TextChangeEvent) {
            // max width of text might have changed
            this._maxColumns = -1;

            // invalidate new range
            const textRange: TextRange = this._textModel.toScreenRange(e.newRange.normalize());
            textRange.end.column = this.size.column + this._scrollPosition.column;
            if (textRange.start.line !== textRange.end.line) {
                textRange.end.line = this.size.line + this._scrollPosition.line;
            }
            this.invalidateRange(textRange);

            this._languageService.invalidate(e.oldRange, e.newRange, e.text);

            // propagate the event to client code
            this.onTextChanged(e);
        }

        private textModel_selectionChanged(e: SelectionChangeEvent) {
            this.invalidateSelection(e.oldRange);
            this.invalidateSelection(e.newRange);

            if (this._blinkTimerEnabled) {
                window.clearInterval(this._blinkTimer);
                this._blinkTimerEnabled = false;
                this._blinkState = true;
            }

            const textRange: TextRange = e.newRange.clone();
            if (textRange.isEmpty) {
                // timer for blinking cursor
                this._blinkTimerEnabled = true;
                this._blinkTimer = window.setInterval(function() {
                    this.invalidateSelection(textRange);
                    this.update();
                    this._blinkState = !this._blinkState;
                }.bind(this), 600);
            }

            // propagate the event to client code
            this.onSelectionChanged(e);
        }

        private onTextChanged(e: TextChangeEvent) {
            for (const handler of this._textChangedHandlers) {
                handler(e);
            }
        }

        private onTextChanging(e: TextChangeEvent) {
            for (const handler of this._textChangingHandlers) {
                handler(e);
            }
        }

        private onSelectionChanged(e: SelectionChangeEvent) {
            for (const handler of this._selectionChangedHandlers) {
                handler(e);
            }
        }
    }
}
