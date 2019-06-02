namespace Textor {
    export class LanguageService {

        public set language(value: ILanguage) {
            this._language = value;
        }

        public get language(): ILanguage {
            return this._language;
        }
        private _textEditor: TextEditor;
        private _textReader: TextReader;
        private _line: number;
        private _column: number;
        private _index: number;
        private _timeout: number;
        private _timeoutEnabled: boolean = false;
        private _language: ILanguage = null;
        private _syntaxTable: LanguageStyle[][] = [];
        private _style: string;
        private _state: string;

        constructor(textEditor: TextEditor) {
            this._textEditor = textEditor;
        }

        public getStyles(line: number): LanguageStyle[] {
            if (this._syntaxTable[line]) {
                return this._syntaxTable[line];
            }
            return [];
        }

        public invalidate(oldRange: TextRange, newRange: TextRange, text: string) {
            if (this._language !== null) {
                // stop existing worker
                if (this._timeoutEnabled) {
                    window.clearTimeout(this._timeout);
                    this._timeoutEnabled = false;
                }

                // search backwards to find position with last known state
                let state = null;
                this._line = 0;
                this._column = 0;
                if (this._syntaxTable.length > 0) {
                    let line = oldRange.start.line;
                    let index = 0;
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
        }

        public log() {
            for (let line: number = 0; line < this._syntaxTable.length; line++) {
                let text: string = "line " + line + ": ";
                if (this._syntaxTable[line]) {
                    text += "[ ";
                    for (const item of this._syntaxTable[line]) {
                        text += item.start + item.style[0] + ((item.state !== null) ? "X" : "-") + " ";
                    }
                    text += " ]";
                }
                console.log(text);
            }
            return "-";
        }

        private window_setTimeout() {
            const timeout: number = new Date().getTime() + 20;

            const startPosition: TextPosition = new TextPosition(this._line, this._column);
            let line: number = this._textReader.textPosition.line;
            let column: number = this._textReader.textPosition.column;

            while (this._textReader.peek().length > 0) {
                const data: ILanguageStyle = this._language.read();
                const c: string = this._textReader.peek();
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
            } else {
                this.addRecord(this._column, this._line, this._style, null);
            }

            this._textEditor.invalidateRange(new TextRange(startPosition, new TextPosition(this._line, this._column)));
            this._textEditor.update();
        }

        private moveRange(oldPosition: TextPosition, newPosition: TextPosition) {
            if (oldPosition.compareTo(newPosition) < 0) {
                // update data after old position to new position
                let index: number = 0;
                while ((this._syntaxTable[oldPosition.line]) && (index < this._syntaxTable[oldPosition.line].length) && (oldPosition.column > this._syntaxTable[oldPosition.line][index].start)) {
                    index++;
                }
                if (this._syntaxTable[oldPosition.line]) {
                    const syntax = this._syntaxTable[oldPosition.line].splice(index, this._syntaxTable[oldPosition.line].length - index);
                    for (const item of syntax) {
                        item.start += newPosition.column - oldPosition.column;
                    }
                    const size = newPosition.line - oldPosition.line;
                    if (size > 0) {
                        const newArray = new Array(size);
                        for (let i = 0; i < size; i++) {
                            newArray[i] = (index > 0) ? [ { style: this._syntaxTable[oldPosition.line][index - 1].style, state: null, start: 0 } ] : [];
                        }
                        const tail = this._syntaxTable.splice(oldPosition.line + 1, this._syntaxTable.length - oldPosition.line + 1);
                        this._syntaxTable = this._syntaxTable.concat(newArray, tail);
                    }
                    this._syntaxTable[newPosition.line] = this._syntaxTable[newPosition.line].concat(syntax);
                }
            } else if (oldPosition.compareTo(newPosition) > 0) {
                // remove data between old position and new position
                let index = 0;
                if (oldPosition.line >= this._syntaxTable.length) {
                    oldPosition.line = this._syntaxTable.length - 1;
                    index = this._syntaxTable[oldPosition.line].length - 1;
                } else {
                    while ((this._syntaxTable[oldPosition.line]) && (index < this._syntaxTable[oldPosition.line].length) && (oldPosition.column > this._syntaxTable[oldPosition.line][index].start)) {
                        index++;
                    }
                }
                if (this._syntaxTable[oldPosition.line]) {
                    const syntax = this._syntaxTable[oldPosition.line].splice(index, this._syntaxTable[oldPosition.line].length - index);
                    for (const item of syntax) {
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
        }

        private clearRange(startPosition: TextPosition, endPosition: TextPosition) {
            if (startPosition.line === endPosition.line) {
                const line = this._syntaxTable[startPosition.line];
                if (line) {
                    let startIndex = -1;
                    for (let i = 0; i < line.length; i++) {
                        if (startIndex === -1 && startPosition.column >= line[i].start) {
                            startIndex = i;
                        }
                        if (startIndex !== -1 && endPosition.column >= line[i].start) {
                            this._syntaxTable[startPosition.line].splice(startIndex, i - startIndex);
                            break;
                        }
                    }
                }
            } else {
                if (this._syntaxTable[startPosition.line]) {
                    for (let i = this._syntaxTable[startPosition.line].length - 1; i >= 0; i--) {
                        if (this._syntaxTable[startPosition.line][i].start > startPosition.column) {
                            this._syntaxTable[startPosition.line].splice(i, 1);
                        }
                    }
                }

                for (let i = startPosition.line + 1; i < endPosition.line; i++) {
                    this._syntaxTable[i] = [];
                }

                if (this._syntaxTable[endPosition.line]) {
                    for (let i = this._syntaxTable[endPosition.line].length - 1; i >= 0; i--) {
                        if (this._syntaxTable[endPosition.line][i].start < endPosition.column) {
                            this._syntaxTable[endPosition.line].splice(i, 1);
                        }
                    }
                }
            }
        }

        private addRecord(column: number, nextLine: number, style: string, state: string) {
            this._syntaxTable[this._line] = this._syntaxTable[this._line] || [];

            if ((this._index > 0) && ((this._index - 1) < this._syntaxTable[this._line].length) && (this._syntaxTable[this._line][this._index - 1].start === this._column)) {
                const current = this._syntaxTable[this._line][this._index - 1];
                current.style = style;
                if (state !== null) {
                    current.state = state;
                }
            } else if (this._index < this._syntaxTable[this._line].length) {
                const current = this._syntaxTable[this._line][this._index];
                if (column >= current.start) {
                    current.start = column;
                    current.style = style;
                    current.state = state;
                    this._index++;
                } else {
                    this._syntaxTable[this._line].splice(this._index, 0, new LanguageStyle(style, state, column));
                    this._index++;
                }
            } else {
                this._syntaxTable[this._line].push(new LanguageStyle(style, state, column));
                this._index++;
            }

            while (this._line < nextLine) {
                this._syntaxTable[this._line].splice(this._index, this._syntaxTable[this._line].length - this._index);

                this._line++;
                this._index = 0;
                this.addRecord(0, this._line, style, null);
            }
        }
    }
}
