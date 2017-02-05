module Textor
{
    export class TextBuffer
    {
        private _lines: string[] = [ "" ];
        private _textChangingHandlers: TextChangeHandler[] = [];
        private _textChangedHandlers: TextChangeHandler[] = [];

        public addEventListener(type: string, callback: (e) => void)
        {
            switch (type)
            {
                case "textchanging": this._textChangingHandlers.push(callback); break;
                case "textchanged":  this._textChangedHandlers.push(callback); break;
            }
        }

        public removeEventListener(type: string, callback: (e) => void)
        {
            switch (type)
            {
                case "textchanging": this._textChangingHandlers.remove(callback); break;
                case "textchanged":  this._textChangedHandlers.remove(callback); break;
            }
        }

        public setText(textRange: TextRange, text: string): TextRange
        {
            var lines: string[] = text.split('\n');
            var lastLine: number = lines.length - 1;
            var newRange: TextRange = new TextRange(textRange.start.clone(), new TextPosition(textRange.start.line + lastLine, ((lines.length === 1) ? textRange.start.column : 0) + lines[lastLine].length));
            lines[0] = this._lines[textRange.start.line].substring(0, textRange.start.column) + lines[0];
            lines[lastLine] = lines[lastLine] + this._lines[textRange.end.line].substring(textRange.end.column);
            this.onTextChanging(new TextChangeEvent(textRange, newRange, text));
            this._lines = this._lines.slice(0, textRange.start.line).concat(lines, this._lines.slice(textRange.end.line + 1));
            this.onTextChanged(new TextChangeEvent(textRange, newRange, text));
            return newRange;
        }

        public getText(textRange: TextRange): string
        {
            if (textRange.start.line !== textRange.end.line)
            {
                var lines: string[] = [];
                lines.push(this._lines[textRange.start.line].substring(textRange.start.column));
                lines = lines.concat(this._lines.slice(textRange.start.line + 1, textRange.end.line));
                lines.push(this._lines[textRange.end.line].substring(0, textRange.end.column));
                return lines.join('\n');
            }
            return this._lines[textRange.start.line].substring(textRange.start.column, textRange.end.column);
        }

        public getTextRange(): TextRange
        {
            return new TextRange(new TextPosition(0, 0), new TextPosition(this._lines.length - 1, this._lines[this._lines.length - 1].length));
        }

        public getLines(): number
        {
            return this._lines.length;
        }

        public getColumns(line: number): number
        {
            return this._lines[line].length;
        }

        public getLine(line: number): string
        {
            return this._lines[line];
        }

        private onTextChanged(e: TextChangeEvent)
        {
            for (var i: number = 0; i < this._textChangedHandlers.length; i++)
            {
                this._textChangedHandlers[i](e);
            }
        }

        private onTextChanging(e: TextChangeEvent)
        {
            for (var i: number = 0; i < this._textChangingHandlers.length; i++)
            {
                this._textChangingHandlers[i](e);
            }
        }
    }
}
