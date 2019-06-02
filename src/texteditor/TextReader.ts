namespace Textor {

    export class TextReader implements ITextReader {

        private _textBuffer: TextBuffer;
        private _textPosition: TextPosition = new TextPosition(0, 0);
        private _lastLine: number;
        private _lastColumn: number;

        constructor(textBuffer: TextBuffer) {
            this._textBuffer = textBuffer;
            this.save();
        }

        public get textPosition(): TextPosition {
            return this._textPosition;
        }

        public peek(): string {
            if (this._textPosition.line < this._textBuffer.getLines()) {
                const text: string = this._textBuffer.getLine(this._textPosition.line);
                return (this._textPosition.column >= text.length) ? "\n" : text[this._textPosition.column];
            }
            return "";
        }

        public read(): string {
            if (this._textPosition.line < this._textBuffer.getLines()) {
                const text: string = this._textBuffer.getLine(this._textPosition.line);
                const c = (this._textPosition.column >= text.length) ? "\n" : text[this._textPosition.column];
                this._textPosition.column++;
                if (this._textPosition.column > text.length) {
                    this._textPosition.column = 0;
                    this._textPosition.line++;
                }
                return c;
            }
            return "";
        }

        public match(text: string): boolean {
            const line: number = this._textPosition.line;
            const column: number = this._textPosition.column;
            let index: number = 0;
            while (index < text.length) {
                const c: string = this.read();
                if ((c.length === 0) || (c !== text[index])) {
                    this._textPosition.line = line;
                    this._textPosition.column = column;
                    return false;
                }
                index++;
            }
            return true;
        }

        public skipWhitespaces(): boolean {
            let character: string;
            let skipped: boolean = false;
            while (((character = this.peek()).length > 0) && this.isWhitespace(character)) {
                this.read();
                skipped = true;
            }
            return skipped;
        }

        public skipLineTerminators(): boolean {
            let character: string;
            let skipped: boolean = false;
            while (((character = this.peek()).length > 0)) {
                if (character === "\n") {
                    this.read();
                    if (this.peek() === "\r") {
                        this.read();
                    }
                    skipped = true;
                    continue;
                } else if (character === "\r" || character === "\u2028" || character === "\u2029") {
                    this.read();
                    skipped = true;
                    continue;
                }
                break;
            }
            return skipped;
        }

        public save() {
            this._lastLine = this._textPosition.line;
            this._lastColumn = this._textPosition.column;
        }

        public restore() {
            this._textPosition.line = this._lastLine;
            this._textPosition.column = this._lastColumn;
        }

        private isWhitespace(character: string): boolean {
            return (character === " " || character === "\t" || character === "\u00A0");
        }
    }
}
