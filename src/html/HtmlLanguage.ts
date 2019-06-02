namespace Textor {

    export class HtmlLanguage implements ILanguage {

        private _languages: any[];
        private _textReader: ITextReader;
        private _tokenStack: any[] = [];
        private _languageToken: any;
        private _state: string;
        private _token: any;

        constructor(languages: any[]) {
            // mixed content languages by mime-type
            this._languages = languages;
        }

        public begin(textReader: ITextReader, state: string) {
            this._textReader = textReader;
            this._tokenStack = [ { type: this.readText } ];

            // used for mixed content in JavaScript or CSS
            this._languageToken = null;

            if (state !== null) {
                const states: string[] = state.split(":");
                if (states.length > 1) {
                    const mimeType: string = states[0];
                    const closeTag: string = states[1];
                    const language = this._languages[mimeType];
                    if (language) {
                        language.begin(this._textReader, states[2]);
                        this.push({ type: this.readLanguage, mimeType: mimeType, language: language, closeTag: closeTag, contentData: 0 });
                    }
                }
            }
        }

        public read(): ILanguageStyle {
            this._state = null;
            this._token = this._tokenStack[this._tokenStack.length - 1];
            if (this._token.type === this.readLanguage) {
                return this._token.type.apply(this);
            }
            return { style: this._token.type.apply(this), state: this._state };
        }

        private readText(): string {
            if (this._textReader.match("<")) {
                if (this._tokenStack.length === 1) {
                    this._state = "base";
                }
                if (this._textReader.match("!")) {
                    if (this._textReader.match("--")) {
                        // comment
                        this.push({ type: this.readComment });
                        return "comment";
                    } else if (this._textReader.match("[CDATA[")) {
                        // constant data
                        this.push({ type: this.readConstantData });
                        return "literal";
                    } else {
                        // doc type
                        this.push({ type: this.readDocType });
                        return "punctuation";
                    }
                } else if (this._textReader.match("?")) {
                    // processing instruction
                    this.push({ type: this.readProcessingInstruction });
                    return "punctuation";
                } else if (this._textReader.match("/")) {
                    // close tag
                    this.push({ type: this.readEndTag });
                    return "punctuation";
                } else {
                    // open tag
                    this.push({ type: this.readStartTag, name: "", hasAttributes: false });
                    return "punctuation";
                }
            } else if (this._textReader.match("&")) {
                // entity
                this.push({ type: this.readEntity });
                return "literal";
            }
            this._textReader.read();
            return "text";
        }

        private readStartTag(): string {
            if (this._textReader.skipWhitespaces()) {
                this._token.hasAttributes = true;
                this.push({ type: this.readAttribute, name: "", hasValue: false });
                return "text";
            }
            if (this._textReader.match(">") || (this._textReader.match("/>"))) {
                this.pop();
                this.setLanguage();
                return "punctuation";
            }
            const c: string = this._textReader.read();
            if (!this._token.hasAttributes) {
                this._token.name += c;
            }
            return "element";
        }

        private readEndTag(): string {
            if (this._textReader.match(">")) {
                this.pop();
                return "punctuation";
            }
            this._token.name += this._textReader.read();
            return "element";
        }

        private readAttribute(): string {
            if (this._textReader.skipWhitespaces()) {
                return "text";
            } else if (this._textReader.match(">")) {
                this.pop();
                this.pop();
                this.setLanguage();
                return "punctuation";
            } else if (this._textReader.match("=")) {
                this.push({ type: this.readAttributeValue, value: "", quote: "" });
                this._token.hasValue = true;
                return "punctuation";
            }
            const c: string = this._textReader.peek();
            if (c === "/") {
                this.pop();
                return "punctuation";
            }
            this._textReader.read();
            if (!this._token.hasValue) {
                this._token.name += c;
            }
            return "attribute";
        }

        private readAttributeValue(): string {
            const c: string = this._textReader.peek();
            if (this._token.quote === "") {
                if (c === "'") {
                    this._textReader.read();
                    this._token.quote = "s"; // single-quote
                    return "literal";
                } else if (c === '"') {
                    this._textReader.read();
                    this._token.quote = "d"; // double-quote
                    return "literal";
                } else if (this._textReader.skipWhitespaces()) {
                    return "text";
                } else {
                    this._token.quote = "-"; // none
                }
            }

            let closeTag: boolean = false;
            let style: string = "";

            if (this._token.quote === "s" && c === "'") {
                this._textReader.read();
                this.pop();
                style = "literal";
            } else if (this._token.quote === "d" && c === '"') {
                this._textReader.read();
                this.pop();
                style = "literal";
            } else if (this._token.quote === "-" && this._textReader.skipWhitespaces()) {
                this.pop();
                style = "text";
            } else if (this._token.quote === "-" && c === ">") {
                this._textReader.read();
                this.pop();
                closeTag = true;
                style = "punctuation";
            }

            if (style.length === 0) {
                this._token.value += this._textReader.read();
                return "literal";
            }

            // check if element has mixed content
            const attributeName: string = this._tokenStack[this._tokenStack.length - 1].name.toUpperCase();
            const elementName: string = this._tokenStack[this._tokenStack.length - 2].name.toUpperCase();
            if ((attributeName === "TYPE" && elementName === "SCRIPT") || (attributeName === "TYPE" && elementName === "STYLE")) {
                const mimeType = this._token.value;
                const language = this._languages[mimeType];
                if (language) {
                    language.begin(this._textReader, null);
                    this._languageToken = { type: this.readLanguage, mimeType: mimeType, language: language, closeTag: "</" + elementName + ">", contentData: 0 };
                }
            }

            // pop attribute
            this.pop();
            if (closeTag) {
                // pop start tag
                this.pop();
                this.setLanguage();
            } else {
                // next attribute
                this.push({ type: this.readAttribute, name: "", value: false });
            }

            return style;
        }

        private readComment(): string {
            this.terminate("-->");
            return "comment";
        }

        private readConstantData(): string {
            this.terminate("]]>");
            return "literal";
        }

        private readEntity(): string {
            const c: string = this._textReader.read();
            if ((c === "\n") || (c === ";")) {
                this.pop();
            }
            return "literal";
        }

        private readDocType(): string {
            return this.terminate(">") ? "punctuation" : "element";
        }

        private readProcessingInstruction(): string {
            return this.terminate("?>") ? "punctuation" : "literal";
        }

        private readLanguage(): any {
            const c: string = this._textReader.peek();
            if (c === "<" || c === "]") {
                if (this.testIgnoreCase("<![CDATA[")) {
                    this._token.contentData++;
                } else if (this.testIgnoreCase("]]>") && (this._token.contentData > 0)) {
                    this._token.contentData--;
                }

                // check for </style> or </script> end tag.
                if ((this._token.contentData === 0) && this.testIgnoreCase(this._token.closeTag)) {
                    this.pop();
                    return this.read();
                }
            }

            const result = this._token.language.read();
            result.state = (result.state !== null) ? (this._token.mimeType + ":" + this._token.closeTag + ":" + result.state) : null;
            return result;
        }

        private push(token) {
            this._tokenStack.push(token);
        }

        private pop() {
            this._tokenStack.pop();
        }

        private setLanguage() {
            if (this._languageToken !== null) {
                this.push(this._languageToken);
                this._languageToken = null;
            }
        }

        private terminate(terminator: string): boolean {
            if (this._textReader.match(terminator)) {
                this.pop();
                return true;
            }
            this._textReader.read();
            return false;
        }

        private testIgnoreCase(text: string): boolean {
            this._textReader.save();
            for (const item of text) {
                const c = this._textReader.read();
                if ((c.length === 0) || (c.toUpperCase() !== item.toUpperCase())) {
                    this._textReader.restore();
                    return false;
                }
            }
            this._textReader.restore();
            return true;
        }
    }
}
