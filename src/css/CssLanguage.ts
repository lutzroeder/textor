namespace Textor {
    export class CssLanguage implements ILanguage {
        private _textReader: ITextReader = null;
        private _tokenStack: any[];
        private _token: any = null;
        private _state: string;

        public begin(textReader: ITextReader, state: string) {
            this._textReader = textReader;
            this._tokenStack = [ {
                bracket: 0,
                keyword: false,
                literal: false,
                selector: 0,
                start: true,
                type: this.readStylesheet,
            } ];
            this._token = null;
        }

        public read(): ILanguageStyle {
            this._state = null;
            this._token = this._tokenStack[this._tokenStack.length - 1];
            return { style: this._token.type.apply(this), state: this._state };
        }

        private readStylesheet(): string {
            if (this._textReader.skipWhitespaces() || this._textReader.skipLineTerminators()) {
                return "text";
            }

            if (this._token.start && this._tokenStack.length === 1) {
                this._state = "base";
                this._token.start = false;
            }

            if (this._textReader.match("{")) {
                this._token.start = true;
                if (!this._token.keyword) {
                    this.push({ type: this.readBlock });
                } else {
                    this.push({ type: this.readStylesheet, selector: 0, bracket: 0, literal: false, keyword: false });
                }
                this._token.keyword = false;
                return "punctuation";
            } else if (this._textReader.match("}")) {
                if (this._tokenStack.length > 1) {
                    this.pop();
                    return "punctuation";
                }
                this._state = null;
                return "error";
            } else if (this._textReader.match("[")) {
                this._token.selector++;
                this._token.literal = false;
                return "punctuation";
            } else if (this._textReader.match("(")) {
                this._token.bracket++;
                return "punctuation";
            } else if (this._textReader.match("]")) {
                this._token.literal = false;
                if (this._token.selector > 0) {
                    this._token.selector--;
                    return "punctuation";
                }
                return "error";
            } else if (this._textReader.match(")")) {
                if (this._token.bracket > 0) {
                    this._token.bracket--;
                    return "punctuation";
                }
                return "error";
            } else if (this._textReader.match("=")) {
                this._token.literal = true;
                return "punctuation";
            } else if (this._textReader.match(";")) {
                this._token.keyword = false;
                return "punctuation";
            } else if (this._textReader.match(":") || this._textReader.match("#") ||
                this._textReader.match(".") || this._textReader.match(",") ||
                this._textReader.match("+") || this._textReader.match("*") ||
                this._textReader.match("|") || this._textReader.match(">")) {
                return "punctuation";
            } else if (this.matchComment()) {
                return "comment";
            } else if (this._textReader.match("@")) {
                this._token.keyword = true;
                this.readWord();
                return "keyword";
            } else if (this.matchString()) {
                return "literal";
            }

            const text: string = this.readWord();
            if (text.length > 0) {
                if ((this._token.bracket > 0) || ((this._token.selector > 0) && (this._token.literal))) {
                    return "literal";
                }
                if (this._token.selector > 0) {
                    return "attribute";
                }
                return "element";
            }

            this._textReader.read();
            return "text";
        }

        private readBlock(): string {
            if (this._textReader.skipWhitespaces() || this._textReader.skipLineTerminators()) {
                return "text";
            } else if (this._textReader.match("}")) {
                this.pop();
                return "punctuation";
            } else if (this.matchComment()) {
                return "comment";
            } else if (this._textReader.match(";")) {
                return "punctuation";
            } else if (this._textReader.match(":")) {
                this.push({ type: this.readExpression });
                return "punctuation";
            }

            const text: string = this.readWord();
            if (text.length > 0) {
                return "attribute";
            }

            this._textReader.read();
            return "text";
        }

        private readExpression(): string {
            if (this._textReader.match(";")) {
                this.pop();
                return "punctuation";
            }
            if (this._textReader.match(",")) {
                this.pop();
                this.push({ type: this.readExpression });
                return "punctuation";
            } else if (this._textReader.match("}")) {
                this.pop();
                this.pop();
                return "punctuation";
            } else if (this._textReader.match("(") || this._textReader.match(")")) {
                return "punctuation";
            } else if (this.matchComment()) {
                return "comment";
            } else if (this.matchString()) {
                return "literal";
            } else if (this._textReader.skipWhitespaces()) {
                return "text";
            } else if (this._textReader.match("url")) {
                return "text";
            }

            this._textReader.read();
            return "literal";
        }

        private readComment(): string {
            this.terminate("*/");
            return "comment";
        }

        private readString(): string {
            if (this._textReader.match("\\")) {
                this._textReader.read();
            } else {
                this.terminate(this._token.quote);
            }
            return "literal";
        }

        private readXmlComment(): string {
            this.terminate(">");
            return "comment";
        }

        private matchComment(): boolean {
            if (this._textReader.match("/*")) {
                this.push({ type: this.readComment });
                return true;
            } else if (this._textReader.match("<!")) {
                this.push({ type: this.readXmlComment });
                return true;
            }
            return false;
        }

        private matchString(): boolean {
            const c: string = this._textReader.peek();
            if (c === "'" || c === '"') {
                this._textReader.read();
                this.push({ type: this.readString, quote: c });
                return true;
            }
            return false;
        }

        private readWord(): string {
            let word: string = "";
            let c: string;
            while (((c = this._textReader.peek()).length > 0) && (/[\w\-\#$_]/.test(c))) {
                word += c;
                this._textReader.read();
            }
            return word;
        }

        private terminate(terminator: string): boolean {
            if (this._textReader.match(terminator)) {
                this.pop();
                return true;
            }
            this._textReader.read();
            return false;
        }

        private push(token: any) {
            this._tokenStack.push(token);
        }

        private pop() {
            this._tokenStack.pop();
        }
    }
}
