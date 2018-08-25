var Textor;
(function (Textor) {
    var HtmlLanguage = /** @class */ (function () {
        function HtmlLanguage(languages) {
            this._tokenStack = [];
            // mixed content languages by mime-type
            this._languages = languages;
        }
        HtmlLanguage.prototype.begin = function (textReader, state) {
            this._textReader = textReader;
            this._tokenStack = [{ type: this.readText }];
            // used for mixed content in JavaScript or CSS
            this._languageToken = null;
            if (state !== null) {
                var states = state.split(":");
                if (states.length > 1) {
                    var mimeType = states[0];
                    var closeTag = states[1];
                    var language = this._languages[mimeType];
                    if (language) {
                        language.begin(this._textReader, states[2]);
                        this.push({ type: this.readLanguage, mimeType: mimeType, language: language, closeTag: closeTag, contentData: 0 });
                    }
                }
            }
        };
        HtmlLanguage.prototype.read = function () {
            this._state = null;
            this._token = this._tokenStack[this._tokenStack.length - 1];
            if (this._token.type === this.readLanguage) {
                return this._token.type.apply(this);
            }
            return { style: this._token.type.apply(this), state: this._state };
        };
        HtmlLanguage.prototype.readText = function () {
            if (this._textReader.match("<")) {
                if (this._tokenStack.length === 1) {
                    this._state = "base";
                }
                if (this._textReader.match("!")) {
                    if (this._textReader.match("--")) {
                        // comment
                        this.push({ type: this.readComment });
                        return "comment";
                    }
                    else if (this._textReader.match("[CDATA[")) {
                        // constant data
                        this.push({ type: this.readConstantData });
                        return "literal";
                    }
                    else {
                        // doc type
                        this.push({ type: this.readDocType });
                        return "punctuation";
                    }
                }
                else if (this._textReader.match("?")) {
                    // processing instruction
                    this.push({ type: this.readProcessingInstruction });
                    return "punctuation";
                }
                else if (this._textReader.match("/")) {
                    // close tag
                    this.push({ type: this.readEndTag });
                    return "punctuation";
                }
                else {
                    // open tag
                    this.push({ type: this.readStartTag, name: "", hasAttributes: false });
                    return "punctuation";
                }
            }
            else if (this._textReader.match("&")) {
                // entity
                this.push({ type: this.readEntity });
                return "literal";
            }
            this._textReader.read();
            return "text";
        };
        HtmlLanguage.prototype.readStartTag = function () {
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
            var c = this._textReader.read();
            if (!this._token.hasAttributes) {
                this._token.name += c;
            }
            return "element";
        };
        HtmlLanguage.prototype.readEndTag = function () {
            if (this._textReader.match(">")) {
                this.pop();
                return "punctuation";
            }
            this._token.name += this._textReader.read();
            return "element";
        };
        HtmlLanguage.prototype.readAttribute = function () {
            if (this._textReader.skipWhitespaces()) {
                return "text";
            }
            else if (this._textReader.match(">")) {
                this.pop();
                this.pop();
                this.setLanguage();
                return "punctuation";
            }
            else if (this._textReader.match("=")) {
                this.push({ type: this.readAttributeValue, value: "", quote: "" });
                this._token.hasValue = true;
                return "punctuation";
            }
            var c = this._textReader.peek();
            if (c === "/") {
                this.pop();
                return "punctuation";
            }
            this._textReader.read();
            if (!this._token.hasValue) {
                this._token.name += c;
            }
            return "attribute";
        };
        HtmlLanguage.prototype.readAttributeValue = function () {
            var c = this._textReader.peek();
            if (this._token.quote === "") {
                if (c === "'") {
                    this._textReader.read();
                    this._token.quote = "s"; // single-quote
                    return "literal";
                }
                else if (c === '"') {
                    this._textReader.read();
                    this._token.quote = "d"; // double-quote
                    return "literal";
                }
                else if (this._textReader.skipWhitespaces()) {
                    return "text";
                }
                else {
                    this._token.quote = "-"; // none
                }
            }
            var closeTag = false;
            var style = "";
            if (this._token.quote === "s" && c === "'") {
                this._textReader.read();
                this.pop();
                style = "literal";
            }
            else if (this._token.quote === "d" && c === '"') {
                this._textReader.read();
                this.pop();
                style = "literal";
            }
            else if (this._token.quote === "-" && this._textReader.skipWhitespaces()) {
                this.pop();
                style = "text";
            }
            else if (this._token.quote === "-" && c === ">") {
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
            var attributeName = this._tokenStack[this._tokenStack.length - 1].name.toUpperCase();
            var elementName = this._tokenStack[this._tokenStack.length - 2].name.toUpperCase();
            if ((attributeName === "TYPE" && elementName === "SCRIPT") || (attributeName === "TYPE" && elementName === "STYLE")) {
                var mimeType = this._token.value;
                var language = this._languages[mimeType];
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
            }
            else {
                // next attribute
                this.push({ type: this.readAttribute, name: "", value: false });
            }
            return style;
        };
        HtmlLanguage.prototype.readComment = function () {
            this.terminate("-->");
            return "comment";
        };
        HtmlLanguage.prototype.readConstantData = function () {
            this.terminate("]]>");
            return "literal";
        };
        HtmlLanguage.prototype.readEntity = function () {
            var c = this._textReader.read();
            if ((c === "\n") || (c === ";")) {
                this.pop();
            }
            return "literal";
        };
        HtmlLanguage.prototype.readDocType = function () {
            return this.terminate(">") ? "punctuation" : "element";
        };
        HtmlLanguage.prototype.readProcessingInstruction = function () {
            return this.terminate("?>") ? "punctuation" : "literal";
        };
        HtmlLanguage.prototype.readLanguage = function () {
            var c = this._textReader.peek();
            if (c === "<" || c === "]") {
                if (this.testIgnoreCase("<![CDATA[")) {
                    this._token.contentData++;
                }
                else if (this.testIgnoreCase("]]>") && (this._token.contentData > 0)) {
                    this._token.contentData--;
                }
                // check for </style> or </script> end tag.
                if ((this._token.contentData === 0) && this.testIgnoreCase(this._token.closeTag)) {
                    this.pop();
                    return this.read();
                }
            }
            var result = this._token.language.read();
            result.state = (result.state !== null) ? (this._token.mimeType + ":" + this._token.closeTag + ":" + result.state) : null;
            return result;
        };
        HtmlLanguage.prototype.push = function (token) {
            this._tokenStack.push(token);
        };
        HtmlLanguage.prototype.pop = function () {
            this._tokenStack.pop();
        };
        HtmlLanguage.prototype.setLanguage = function () {
            if (this._languageToken !== null) {
                this.push(this._languageToken);
                this._languageToken = null;
            }
        };
        HtmlLanguage.prototype.terminate = function (terminator) {
            if (this._textReader.match(terminator)) {
                this.pop();
                return true;
            }
            this._textReader.read();
            return false;
        };
        HtmlLanguage.prototype.testIgnoreCase = function (text) {
            this._textReader.save();
            for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
                var item = text_1[_i];
                var c = this._textReader.read();
                if ((c.length === 0) || (c.toUpperCase() !== item.toUpperCase())) {
                    this._textReader.restore();
                    return false;
                }
            }
            this._textReader.restore();
            return true;
        };
        return HtmlLanguage;
    }());
    Textor.HtmlLanguage = HtmlLanguage;
})(Textor || (Textor = {}));
//# sourceMappingURL=html.js.map