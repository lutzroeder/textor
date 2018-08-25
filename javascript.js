var Textor;
(function (Textor) {
    var JavaScriptLanguage = /** @class */ (function () {
        function JavaScriptLanguage() {
            this._regExpCommands = { g: true, i: true, m: true };
            this._blockStatements = {
                case: true, catch: true, default: true, do: true,
                else: true, finally: true, for: true, if: true,
                switch: true, try: true, while: true, with: true,
            };
            this._expressionStatements = { return: true, delete: true, throw: true };
            this._terminalStatements = { break: true, continue: true };
            this._literals = { true: true, false: true, null: true, undefinded: true, NaN: true, Infinity: true };
            this._operators = { in: true, typeof: true, instanceof: true, new: true };
            this._locals = { this: true, arguments: true };
        }
        JavaScriptLanguage.prototype.begin = function (textReader, state) {
            this._textReader = textReader;
            this._tokenStack = [{ type: this.readBlockStatement, state: "root" }];
            this._token = null;
        };
        JavaScriptLanguage.prototype.read = function () {
            this._state = null;
            this._token = this._tokenStack[this._tokenStack.length - 1];
            var style = this._token.type.apply(this);
            if (this._textReader.peek().length === 0) {
                // end of file
                this.popToken(this.readExpression);
                this.popToken(this.readVariable);
                this.popToken(this.readStatement);
            }
            return { style: style, state: this._state };
        };
        JavaScriptLanguage.prototype.readLineComment = function () {
            this.terminate("\n");
            return "comment";
        };
        JavaScriptLanguage.prototype.readBlockComment = function () {
            this.terminate("*/");
            return "comment";
        };
        JavaScriptLanguage.prototype.readStatement = function () {
            if (this._textReader.peek() === "}") {
                this.pop();
                return null;
            }
            else if (this._textReader.match(";") || this._textReader.match(",")) {
                this.pop();
                return "punctuation";
            }
            else if (this._textReader.match("{")) {
                this.push({ type: this.readBlockStatement, state: "" });
                return "punctuation";
            }
            else if (this._textReader.skipLineTerminators()) {
                return "text";
            }
            if ((this._token.start) && (this._tokenStack.length <= 2)) {
                this._state = "base";
                this._token.start = false;
            }
            var style = this.readExpression();
            if (this._textReader.peek().length === 0) {
                this.pop();
            }
            return style;
        };
        JavaScriptLanguage.prototype.readExpression = function () {
            var c = this._textReader.peek();
            if (c === ")" || c === "}" || c === "]") {
                this.pop();
                return null;
            }
            else if (c === "," || c === ";") {
                this.pop();
                return null;
            }
            else if (this._textReader.skipLineTerminators()) {
                return "text";
            }
            else if (this._textReader.skipWhitespaces()) {
                return "text";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            else if (this.matchLiteral() || this.matchRegExp()) {
                this._token.continuation = false;
                this._token.regexp = false;
                return "literal";
            }
            else if (this.matchBlockExpression()) {
                this._token.continuation = false;
                this._token.regexp = false;
                return "punctuation";
            }
            else if (this._textReader.match("++") || this._textReader.match("--")) {
                this._token.regexp = false;
                return "punctuation";
            }
            else if (/[+\-*^&%<>!|]/.test(c)) {
                this._token.continuation = true;
                this._token.regexp = true;
                this._textReader.read();
                return "punctuation";
            }
            else if (c === "?" || c === "=") {
                this._textReader.read();
                this._token.regexp = true;
                this._token.continuation = true;
                this.push({ type: this.readExpression, continuation: true, regexp: true });
                return "punctuation";
            }
            else if (c === ":") {
                this._textReader.read();
                this._token.regexp = true;
                this._token.continuation = true;
                return "punctuation";
            }
            else if (c === "." || c === "/") {
                this._textReader.read();
                this._token.continuation = true;
                return "punctuation";
            }
            if (!this._token.continuation) {
                this.pop();
                return null;
            }
            var text = this.readWord();
            if (text === "function") {
                this._token.continuation = false;
                this.push({ type: this.readFunction, name: "", state: "name" });
                return "keyword";
            }
            else if (text === "var" || text === "const") {
                this.push({ type: this.readVariable, state: "none" });
                return "keyword";
            }
            if (this._token.type === this.readStatement) {
                if (this._blockStatements.hasOwnProperty(text) || this._terminalStatements.hasOwnProperty(text)) {
                    return "keyword";
                }
                else if (this._expressionStatements.hasOwnProperty(text)) {
                    this.push({ type: this.readExpression, continuation: true, regexp: true });
                    return "keyword";
                }
            }
            if (this._locals.hasOwnProperty(text) || this._operators.hasOwnProperty(text)) {
                this._token.regexp = false;
                return "keyword";
            }
            else if (this._literals.hasOwnProperty(text)) {
                return "literal";
            }
            else if (text.length > 0) {
                this._token.continuation = false;
                this._token.regexp = false;
                return "text";
            }
            this._textReader.read();
            return "error";
        };
        JavaScriptLanguage.prototype.readBlockStatement = function () {
            if (this._textReader.match("}")) {
                if ((this._token.type === this.readBlockStatement) && (this._token.state !== "root")) {
                    this.pop();
                    return "punctuation";
                }
                return "error";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            else if (this._textReader.match("]") || this._textReader.match(")")) {
                return "error";
            }
            this.push({ type: this.readStatement, continuation: true, regexp: true, start: true });
            return null;
        };
        JavaScriptLanguage.prototype.readBlockExpression = function () {
            if (this._textReader.match(",") || this._textReader.match(";")) {
                return "punctuation";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            this.push({ type: this.readExpression, continuation: true, regexp: true });
            return null;
        };
        JavaScriptLanguage.prototype.readArray = function () {
            if (this._textReader.match("]")) {
                this.pop();
                return "punctuation";
            }
            else if (this._textReader.match("}") || this._textReader.match(")")) {
                return "error";
            }
            return this.readBlockExpression();
        };
        JavaScriptLanguage.prototype.readArguments = function () {
            if (this._textReader.match(")")) {
                this.pop();
                return "punctuation";
            }
            else if (this._textReader.match("]") || this._textReader.match("}")) {
                return "error";
            }
            return this.readBlockExpression();
        };
        JavaScriptLanguage.prototype.readObject = function () {
            if (this._textReader.match("}")) {
                this.pop();
                return "punctuation";
            }
            else if (this._textReader.match("]") || this._textReader.match(")")) {
                return "error";
            }
            else if (this._textReader.skipWhitespaces() || this._textReader.skipLineTerminators()) {
                return "text";
            }
            else if (this._textReader.match(",")) {
                this._token.identifier = true;
                return "punctuation";
            }
            else if (this._token.identifier) {
                this._textReader.save();
                var identifier = this.readWord();
                if (identifier.length > 0) {
                    this._textReader.skipWhitespaces();
                    if (this._textReader.peek() === ":") {
                        this._textReader.restore();
                        this.readWord();
                        return "declaration";
                    }
                }
                this._textReader.restore();
            }
            this._token.identifier = false;
            return this.readBlockExpression();
        };
        JavaScriptLanguage.prototype.readFunction = function () {
            if (this._token.state === "block") {
                this.pop();
                return null;
            }
            else if (this._textReader.skipWhitespaces() || this._textReader.skipLineTerminators()) {
                return "text";
            }
            else if (this._token.state === "name") {
                var c = this._textReader.peek();
                if (/[\w\$_]/.test(c)) {
                    this._token.name += this._textReader.read();
                    return "declaration";
                }
                this._token.state = "next";
                return null;
            }
            else if (this._textReader.match("(")) {
                this._token.state = "parameters";
                this.push({ type: this.readParameters });
                return "punctuation";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            else if (this._textReader.match("{")) {
                this._token.state = "block";
                this.push({ type: this.readBlockStatement, delimiter: "}" });
                return "punctuation";
            }
            this._textReader.read();
            return "error";
        };
        JavaScriptLanguage.prototype.readParameters = function () {
            if (this._textReader.match(")")) {
                this.pop();
                return "punctuation";
            }
            else if (this._textReader.match(",")) {
                return "punctuation";
            }
            else if (this._textReader.skipWhitespaces() || this._textReader.skipLineTerminators()) {
                return "text";
            }
            else if (this.matchComment()) {
                return "comment";
            }
            var text = this.readWord();
            if (text.length > 0) {
                return "declaration";
            }
            this._textReader.read();
            return "error";
        };
        JavaScriptLanguage.prototype.readString = function () {
            if (this._textReader.match("\\")) {
                this._token.value += "\\" + this._textReader.read();
            }
            else if (this._textReader.match(this._token.value[0])) {
                this._token.value += this._token.value[0];
                this.pop();
            }
            else {
                this._token.value += this._textReader.read();
            }
            return "literal";
        };
        JavaScriptLanguage.prototype.readNumber = function () {
            var c = this._textReader.peek();
            if (c >= "0" && c <= "9") {
                this._token.value += this._textReader.read();
                return "literal";
            }
            else if ((c === ".") && (this._token.comma) && (this._token.value !== "00")) {
                this._token.comma = false;
                this._token.value += this._textReader.read();
                return "literal";
            }
            else if (c === "E" || c === "e") {
                this._token.comma = false;
                this._token.value += this._textReader.read();
                c = this._textReader.peek();
                if (c === "+" || c === "-") {
                    this._token.value += this._textReader.read();
                }
                return "literal";
            }
            this.pop();
            return null;
        };
        JavaScriptLanguage.prototype.readHexNumber = function () {
            var c = this._textReader.peek();
            if ((c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F")) {
                this._token.value += this._textReader.read();
                return "literal";
            }
            this.pop();
            return null;
        };
        JavaScriptLanguage.prototype.readVariable = function () {
            if (this._textReader.peek() === ";") {
                this.pop();
                return null;
            }
            else if (this.matchComment()) {
                return "comment";
            }
            else if (this._token.state === "none") {
                if (this._textReader.skipLineTerminators() || this._textReader.skipWhitespaces()) {
                    return "text";
                }
                this._token.state = "name";
                this._token.name = this._textReader.read();
                return "declaration";
            }
            else if (this._token.state === "name") {
                if (this._textReader.skipLineTerminators() || this._textReader.skipWhitespaces()) {
                    this._token.state = "next";
                    return "text";
                }
                else if ((this._textReader.peek() === ",") || (this._textReader.peek() === "=")) {
                    this._token.state = "next";
                    return null;
                }
                this._token.name += this._textReader.read();
                return "declaration";
            }
            else if (this._token.state === "next") {
                if (this._textReader.skipLineTerminators() || this._textReader.skipWhitespaces()) {
                    return "text";
                }
                else if (this._textReader.match(",")) {
                    this.pop();
                    this.push({ type: this.readVariable, state: "none", name: "" });
                    return "punctuation";
                }
                else if (this._textReader.match("=")) {
                    this._token.state = "expression";
                    this.push({ type: this.readExpression, continuation: true, regexp: true });
                    return "punctuation";
                }
                else if (this._textReader.match("in")) {
                    this.pop();
                    return "keyword";
                }
            }
            else if (this._token.state === "expression") {
                if (this._textReader.skipLineTerminators()) {
                    return null;
                }
                else if (this._textReader.skipWhitespaces()) {
                    return "text";
                }
                else if (this._textReader.peek() === ",") {
                    this._token.state = "next";
                    return null;
                }
            }
            this.pop();
            return null;
        };
        JavaScriptLanguage.prototype.matchLiteral = function () {
            this._textReader.save();
            var c = this._textReader.read();
            var value = c;
            if (c === "'" || c === '"') {
                // string literal
                this.push({ type: this.readString, value: value });
                return true;
            }
            var comma = true;
            if (c === "-") {
                // negative number
                c = this._textReader.read();
                value += c;
            }
            if ((c === "0") && (this._textReader.peek().toUpperCase() === "X")) {
                // hex number
                value += this._textReader.read();
                this.push({ type: this.readHexNumber, value: value, comma: false });
                return true;
            }
            else if (c === ".") {
                // floating point
                c = this._textReader.read();
                value += c;
                comma = false;
            }
            if (c >= "0" && c <= "9") {
                this.push({ type: this.readNumber, value: value, comma: comma });
                return true;
            }
            this._textReader.restore();
            return false;
        };
        JavaScriptLanguage.prototype.matchRegExp = function () {
            this._textReader.save();
            if (this._token.regexp && this._textReader.match("/")) {
                while (this._textReader.peek().length > 0 && !this._textReader.skipLineTerminators()) {
                    if (this._textReader.match("\\")) {
                        this._textReader.read();
                    }
                    else if (this._textReader.match("[")) {
                        var range = false;
                        while (this._textReader.peek().length > 0 && !this._textReader.skipLineTerminators()) {
                            if (this._textReader.match("]")) {
                                range = true;
                                break;
                            }
                            this._textReader.match("\\");
                            this._textReader.read();
                        }
                        if (!range) {
                            break;
                        }
                    }
                    else if (this._textReader.match("/")) {
                        while (this._textReader.peek().length > 0 &&
                            this._regExpCommands.hasOwnProperty(this._textReader.peek())) {
                            this._textReader.read();
                        }
                        return true;
                    }
                    else {
                        this._textReader.read();
                    }
                }
            }
            this._textReader.restore();
            return false;
        };
        JavaScriptLanguage.prototype.matchBlockExpression = function () {
            if (this._textReader.match("{")) {
                this.push({ type: this.readObject, identifier: true });
                return true;
            }
            else if (this._textReader.match("(")) {
                this.push({ type: this.readArguments });
                return true;
            }
            else if (this._textReader.match("[")) {
                this.push({ type: this.readArray });
                return true;
            }
            return false;
        };
        JavaScriptLanguage.prototype.matchComment = function () {
            if (this._textReader.match("//")) {
                this.push({ type: this.readLineComment });
                return true;
            }
            else if (this._textReader.match("/*")) {
                this.push({ type: this.readBlockComment });
                return true;
            }
            return false;
        };
        JavaScriptLanguage.prototype.readWord = function () {
            var word = "";
            var c;
            while (((c = this._textReader.peek()).length > 0) && (/[\w\$_]/.test(c))) {
                word += c;
                this._textReader.read();
            }
            return word;
        };
        JavaScriptLanguage.prototype.terminate = function (terminator) {
            if (this._textReader.match(terminator)) {
                this.pop();
                return true;
            }
            this._textReader.read();
            return false;
        };
        JavaScriptLanguage.prototype.popToken = function (tokenType) {
            if ((this._tokenStack.length > 1) && (this._tokenStack[this._tokenStack.length - 1].type === tokenType)) {
                this.pop();
            }
        };
        JavaScriptLanguage.prototype.push = function (token) {
            this._tokenStack.push(token);
        };
        JavaScriptLanguage.prototype.pop = function () {
            this._tokenStack.pop();
        };
        return JavaScriptLanguage;
    }());
    Textor.JavaScriptLanguage = JavaScriptLanguage;
})(Textor || (Textor = {}));
//# sourceMappingURL=javascript.js.map