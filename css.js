var Textor;
(function (Textor) {
    var CssLanguage = /** @class */ (function () {
        function CssLanguage() {
            this._textReader = null;
            this._token = null;
        }
        CssLanguage.prototype.begin = function (textReader, state) {
            this._textReader = textReader;
            this._tokenStack = [{
                    bracket: 0,
                    keyword: false,
                    literal: false,
                    selector: 0,
                    start: true,
                    type: this.readStylesheet,
                }];
            this._token = null;
        };
        CssLanguage.prototype.read = function () {
            this._state = null;
            this._token = this._tokenStack[this._tokenStack.length - 1];
            return { style: this._token.type.apply(this), state: this._state };
        };
        CssLanguage.prototype.readStylesheet = function () {
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
                }
                else {
                    this.push({ type: this.readStylesheet, selector: 0, bracket: 0, literal: false, keyword: false });
                }
                this._token.keyword = false;
                return "punctuation";
            }
            else if (this._textReader.match("}")) {
                if (this._tokenStack.length > 1) {
                    this.pop();
                    return "punctuation";
                }
                this._state = null;
                return "error";
            }
            else if (this._textReader.match("[")) {
                this._token.selector++;
                this._token.literal = false;
                return "punctuation";
            }
            else if (this._textReader.match("(")) {
                this._token.bracket++;
                return "punctuation";
            }
            else if (this._textReader.match("]")) {
                this._token.literal = false;
                if (this._token.selector > 0) {
                    this._token.selector--;
                    return "punctuation";
                }
                return "error";
            }
            else if (this._textReader.match(")")) {
                if (this._token.bracket > 0) {
                    this._token.bracket--;
                    return "punctuation";
                }
                return "error";
            }
            else if (this._textReader.match("=")) {
                this._token.literal = true;
                return "punctuation";
            }
            else if (this._textReader.match(";")) {
                this._token.keyword = false;
                return "punctuation";
            }
            else if (this._textReader.match(":") || this._textReader.match("#") ||
                this._textReader.match(".") || this._textReader.match(",") ||
                this._textReader.match("+") || this._textReader.match("*") ||
                this._textReader.match("|") || this._textReader.match(">")) {
                return "punctuation";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            else if (this._textReader.match("@")) {
                this._token.keyword = true;
                this.readWord();
                return "keyword";
            }
            else if (this.matchString()) {
                return "literal";
            }
            var text = this.readWord();
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
        };
        CssLanguage.prototype.readBlock = function () {
            if (this._textReader.skipWhitespaces() || this._textReader.skipLineTerminators()) {
                return "text";
            }
            else if (this._textReader.match("}")) {
                this.pop();
                return "punctuation";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            else if (this._textReader.match(";")) {
                return "punctuation";
            }
            else if (this._textReader.match(":")) {
                this.push({ type: this.readExpression });
                return "punctuation";
            }
            var text = this.readWord();
            if (text.length > 0) {
                return "attribute";
            }
            this._textReader.read();
            return "text";
        };
        CssLanguage.prototype.readExpression = function () {
            if (this._textReader.match(";")) {
                this.pop();
                return "punctuation";
            }
            if (this._textReader.match(",")) {
                this.pop();
                this.push({ type: this.readExpression });
                return "punctuation";
            }
            else if (this._textReader.match("}")) {
                this.pop();
                this.pop();
                return "punctuation";
            }
            else if (this._textReader.match("(") || this._textReader.match(")")) {
                return "punctuation";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            else if (this.matchString()) {
                return "literal";
            }
            else if (this._textReader.skipWhitespaces()) {
                return "text";
            }
            else if (this._textReader.match("url")) {
                return "text";
            }
            this._textReader.read();
            return "literal";
        };
        CssLanguage.prototype.readComment = function () {
            this.terminate("*/");
            return "comment";
        };
        CssLanguage.prototype.readString = function () {
            if (this._textReader.match("\\")) {
                this._textReader.read();
            }
            else {
                this.terminate(this._token.quote);
            }
            return "literal";
        };
        CssLanguage.prototype.readXmlComment = function () {
            this.terminate(">");
            return "comment";
        };
        CssLanguage.prototype.matchComment = function () {
            if (this._textReader.match("/*")) {
                this.push({ type: this.readComment });
                return true;
            }
            else if (this._textReader.match("<!")) {
                this.push({ type: this.readXmlComment });
                return true;
            }
            return false;
        };
        CssLanguage.prototype.matchString = function () {
            var c = this._textReader.peek();
            if (c === "'" || c === '"') {
                this._textReader.read();
                this.push({ type: this.readString, quote: c });
                return true;
            }
            return false;
        };
        CssLanguage.prototype.readWord = function () {
            var word = "";
            var c;
            while (((c = this._textReader.peek()).length > 0) && (/[\w\-\#$_]/.test(c))) {
                word += c;
                this._textReader.read();
            }
            return word;
        };
        CssLanguage.prototype.terminate = function (terminator) {
            if (this._textReader.match(terminator)) {
                this.pop();
                return true;
            }
            this._textReader.read();
            return false;
        };
        CssLanguage.prototype.push = function (token) {
            this._tokenStack.push(token);
        };
        CssLanguage.prototype.pop = function () {
            this._tokenStack.pop();
        };
        return CssLanguage;
    }());
    Textor.CssLanguage = CssLanguage;
})(Textor || (Textor = {}));
//# sourceMappingURL=css.js.map