namespace Textor {
    export class TextModel {
        private _textBuffer: TextBuffer;
        private _undoService: UndoService;
        private _textRange: TextRange = new TextRange(new TextPosition(0, 0), new TextPosition(0, 0));
        private _selectionChangedHandlers: SelectionChangeHandler[] = [];
        private _tabSize: number;
        private _tabText: string;

        constructor(undoService: UndoService, textBuffer: TextBuffer) {
            this._textBuffer = textBuffer;
            this._undoService = undoService;
        }

        public addEventListener(type: string, callback: (e) => void) {
            switch (type) {
                case "selectionchanged":  this._selectionChangedHandlers.push(callback); break;
            }
        }

        public removeEventListener(type: string, callback: (e) => void) {
            switch (type) {
                case "selectionchanged":  this._selectionChangedHandlers = this._selectionChangedHandlers.filter((item) => item !== callback); break;
            }
        }

        public get textRange(): TextRange {
            return this._textRange;
        }

        public get tabText(): string {
            return this._tabText;
        }

        public select(textPosition: TextPosition) {
            if (!textPosition.equals(this._textRange.start) || !textPosition.equals(this._textRange.end)) {
                const oldRange: TextRange = this._textRange;
                this._textRange = new TextRange(new TextPosition(textPosition.line, textPosition.column),
                    new TextPosition(textPosition.line, textPosition.column));
                this.onSelectionChanged(new SelectionChangeEvent(oldRange, this._textRange));
            }
        }

        public selectRange(textRange: TextRange) {
            if (!textRange.start.equals(this._textRange.start) || !textRange.end.equals(this._textRange.end)) {
                const oldRange = this._textRange;
                this._textRange = textRange;
                this.onSelectionChanged(new SelectionChangeEvent(oldRange, this._textRange));
            }
        }

        public moveCursor(dimension: string, distance: string, direction: string, select: boolean) {
            let position: TextPosition = this._textRange.end;
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
                        } else {
                            // search first non-whitespace character
                            const text: string = this._textBuffer.getLine(position.line);
                            for (let i = 0; i < text.length; i++) {
                                if ((text[i] !== " ") && (text[i] !== "\t")) {
                                    position.column = (i === position.column) ? 0 : i;
                                    break;
                                }
                            }
                        }
                    } else if (distance === "word") {
                        const text: string = this._textBuffer.getLine(position.line);
                        if ((direction !== "previous") && (position.column >= text.length)) {
                            position.column++;
                        } else if ((direction === "previous") && (position.column === 0)) {
                            position.column--;
                        } else {
                            position.column = this.findWordBreak(text,
                                position.column, (direction === "previous") ? -1 : +1);
                        }
                    } else {
                        position.column += (direction === "previous") ? -Number(distance) : +Number(distance);
                    }

                    if (position.column < 0) {
                        position.line--;
                        if (position.line < 0) {
                            position.line = 0;
                            position.column = 0;
                        } else {
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
                } else if (position.line > this._textBuffer.getLines() - 1) {
                    position.line = this._textBuffer.getLines() - 1;
                    position.column = this._textBuffer.getColumns(position.line);
                }
            }

            // switch back to selection units with tabs expanded
            position = this.toScreenPosition(position);

            const textRange = (select) ?
                new TextRange(new TextPosition(this._textRange.start.line, this._textRange.start.column), position) :
                new TextRange(position, position);

            this._undoService.begin();
            this._undoService.add(new SelectionUndoUnit(this, textRange));
            this._undoService.commit();
        }

        public insertText(text: string) {
            this._undoService.begin();
            this._undoService.add(new TextUndoUnit(
                this, this._textBuffer, this.toBufferRange(this.getTextRange()), text));
            this._undoService.commit();
        }

        public deleteSelection(position: string) {
            if (!this.isCursor() || (position === null)) {
                this.insertText("");
            } else {
                const textRange = this.toBufferRange(this.getTextRange());
                if (position === "previous") {
                    textRange.start.column--;
                    if (textRange.start.column < 0) {
                        textRange.start.line--;
                        if (textRange.start.line < 0) {
                            textRange.start.line = 0;
                            textRange.start.column = 0;
                        } else {
                            textRange.start.column = this._textBuffer.getColumns(textRange.start.line);
                        }
                    }
                } else if (position === "next") {
                    textRange.end.column++;
                    if (textRange.end.column > this._textBuffer.getColumns(textRange.end.line)) {
                        textRange.end.line++;
                        if (textRange.end.line > this._textBuffer.getLines() - 1) {
                            textRange.end.line = this._textBuffer.getLines() - 1;
                            textRange.end.column = this._textBuffer.getColumns(textRange.end.line);
                        } else {
                            textRange.end.column = 0;
                        }
                    }
                }

                this._undoService.begin();
                this._undoService.add(new TextUndoUnit(this, this._textBuffer, textRange, ""));
                this._undoService.commit();
            }
        }

        public getTextRange(): TextRange {
            // return valid range with tabs expanded
            if (this.isCursor()) {
                let line: number = this._textRange.start.line;
                let column: number = this._textRange.start.column;
                if (line >= this._textBuffer.getLines()) {
                    line = this._textBuffer.getLines() - 1;
                    column = this.getColumns(line);
                } else if (column > this.getColumns(line)) {
                    column = this.getColumns(line);
                }
                return new TextRange(new TextPosition(line, column), new TextPosition(line, column));
            }

            const textRange: TextRange = this._textRange.clone();
            if (textRange.start.line >= this._textBuffer.getLines()) {
                textRange.start.line = this._textBuffer.getLines() - 1;
                textRange.start.column = this.getColumns(textRange.start.line);
            }
            if (textRange.end.line >= this._textBuffer.getLines()) {
                textRange.end.line = this._textBuffer.getLines() - 1;
                textRange.end.column = this.getColumns(textRange.end.line);
            }
            if (textRange.start.column > this.getColumns(textRange.start.line)) {
                textRange.start = new TextPosition(textRange.start.line, this.getColumns(textRange.start.line));
            }
            if (textRange.end.column > this.getColumns(textRange.end.line)) {
                textRange.end = new TextPosition(textRange.end.line, this.getColumns(textRange.end.line));
            }
            return textRange.normalize();
        }

        public isCursor(): boolean {
            return this._textRange.isEmpty;
        }

        public set tabSize(value: number) {
            this._tabSize = value;
            this._tabText = "";
            for (let i = 0; i < this._tabSize; i++) {
                this._tabText += " ";
            }
        }

        public get tabSize(): number {
            return this._tabSize;
        }

        public getColumns(line: number): number {
            return this.getTabLength(this._textBuffer.getLine(line));
        }

        public getTabLength(text: string): number {
            let tabLength = 0;
            const bufferLength = text.length;
            for (let i = 0; i < bufferLength; i++) {
                tabLength += (text[i] === "\t") ? this._tabSize : 1;
            }
            return tabLength;
        }

        public toScreenPosition(textPosition: TextPosition) {
            // transform from text buffer position to selection position.
            const text = this._textBuffer.getLine(textPosition.line).substring(0, textPosition.column);
            const length = this.getTabLength(text) - text.length;
            return new TextPosition(textPosition.line, textPosition.column + length);
        }

        public toBufferPosition(textPosition: TextPosition) {
            // transform from selection position to text buffer position.
            const text = this._textBuffer.getLine(textPosition.line);
            let column = 0;
            for (let i = 0; i < text.length; i++) {
                column += (text[i] === "\t") ? this._tabSize : 1;
                if (column > textPosition.column) {
                    return new TextPosition(textPosition.line, i);
                }
            }
            return new TextPosition(textPosition.line, text.length);
        }

        public toScreenRange(textRange: TextRange): TextRange {
            return new TextRange(this.toScreenPosition(textRange.start), this.toScreenPosition(textRange.end));
        }

        public toBufferRange(textRange: TextRange): TextRange {
            return new TextRange(this.toBufferPosition(textRange.start), this.toBufferPosition(textRange.end));
        }

        public getIndent(): string {
            const textRange: TextRange = this.getTextRange();
            if (textRange.isEmpty) {
                let text: string = this._textBuffer.getLine(textRange.end.line);
                let index: number = 0;
                while ((index < text.length) && (text[index] === "\t" || text[index] === " ")) {
                    index++;
                }
                text = text.substring(0, index);
                if (textRange.end.column >= this.getTabLength(text)) {
                    return text;
                }
            }
            return "";
        }

        public findWordBreak(text: string, startIndex: number, increment: number): number {
            if (increment < 0) {
                startIndex += increment;
            }
            const startState: boolean = this.isWordSeparator(text[startIndex]);
            for (let i = startIndex; (i >= 0) && (i < text.length); i += increment) {
                if (this.isWordSeparator(text[i]) !== startState) {
                    return (increment < 0) ? (i -= increment) : i;
                }
            }
            return (increment < 0) ? 0 : text.length;
        }

        private isWordSeparator(character: string): boolean {
            return ' \t\'",;.!~@#$%^&*?=<>()[]:\\+-'.indexOf(character) !== -1;
        }

        private onSelectionChanged(e: SelectionChangeEvent) {
            for (const handler of this._selectionChangedHandlers) {
                handler(e);
            }
        }
    }
}
