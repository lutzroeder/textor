
var JavaScript = function()
{
	this.regExpCommands = { 'g': true, 'i': true, 'm': true };
	this.blockStatements = { 'if': true, 'while': true, 'with': true, 'for': true, 'else': true, 'do': true, 'try': true, 'catch': true, 'finally': true, 'switch': true, 'case': true, 'default': true };
	this.expressionStatements = { 'return': true, 'delete': true, 'throw': true };
	this.terminalStatements = { 'break': true, 'continue': true };
	this.literals = { 'true': true, 'false': true, 'null': true, 'undefinded': true, 'NaN': true, 'Infinity': true };
	this.operators = { 'in': true, 'typeof': true, 'instanceof': true, 'new': true };
	this.locals = { 'this': true, 'arguments': true };
};

JavaScript.prototype.begin = function(textReader, state)
{
	this.textReader = textReader;
	this.tokenStack = [{ type: this.readBlockStatement, state: 'root' }];
	this.token = null;
};

JavaScript.prototype.read = function()
{
	this.state = null;
	this.token = this.tokenStack[this.tokenStack.length - 1];
	var style = this.token.type.apply(this);
	if (this.textReader.peek() === -1)
	{
		// end of file
		this.popToken(this.readExpression);
		this.popToken(this.readVariable);
		this.popToken(this.readStatement);
	}
	return { style: style, state: this.state };
};

JavaScript.prototype.readLineComment = function()
{
	this.terminate('\n');
	return 'comment';
};

JavaScript.prototype.readBlockComment = function()
{
	this.terminate('*/');
	return 'comment';
};

JavaScript.prototype.readStatement = function()
{
	if (this.textReader.peek() === '}')
	{
		this.pop();
		return null;
	}
	else if (this.textReader.match(';') || this.textReader.match(','))
	{
		this.pop();
		return 'punctuation';
	}
	else if (this.textReader.match('{'))
	{
		this.push({ type: this.readBlockStatement, state: '' });
		return 'punctuation';
	}
	else if (this.textReader.skipLineTerminators())
	{
		return 'text';
	}
	
	if ((this.token.start) && (this.tokenStack.length <= 2))
	{
		this.state = 'base';
		this.token.start = false;
	}
	
	var style = this.readExpression();
	if (this.textReader.peek() === -1)
	{
		this.pop();
	}
	return style;
};

JavaScript.prototype.readExpression = function()
{
	var c = this.textReader.peek();
	if (c === ')' || c === '}' || c === ']')
	{
		this.pop();
		return null;
	}
	else if (c === ',' || c === ';')
	{
		this.pop();
		return null;
	}
	else if (this.textReader.skipLineTerminators())
	{
		return 'text';
	}
	else if (this.textReader.skipWhitespaces())
	{
		return 'text';
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	else if (this.matchLiteral() || this.matchRegExp())
	{
		this.token.continuation = false;
		this.token.regexp = false;
		return 'literal';
	}
	else if (this.matchBlockExpression())
	{
		this.token.continuation = false;
		this.token.regexp = false;
		return 'punctuation';
	}
	else if (this.textReader.match('++') || this.textReader.match('--'))
	{
		this.token.regexp = false;
		return 'punctuation';
	}
	else if (/[+\-*^&%<>!|]/.test(c))
	{
		this.token.continuation = true;
		this.token.regexp = true;
		this.textReader.read();
		return 'punctuation';
	}
	else if (c === '?' || c === '=')
	{
		this.textReader.read();
		this.token.regexp = true;
		this.token.continuation = true;
		this.push({ type: this.readExpression, continuation: true, regexp: true });
		return 'punctuation';		
	}
	else if (c === ':')
	{
		this.textReader.read();
		this.token.regexp = true;
		this.token.continuation = true;
		return 'punctuation';		
	}
	else if (c === '.' || c === '/')
	{
		this.textReader.read();
		this.token.continuation = true;
		return 'punctuation';
	}
	if (!this.token.continuation)
	{
		this.pop();
		return null;
	}
	var text = this.readWord();
	if (text === 'function')
	{
		this.token.continuation = false;
		this.push({ type: this.readFunction, name: '', state: 'name' });
		return 'keyword';
	}
	else if (text === 'var' || text === 'const')
	{
		this.push({ type: this.readVariable, state: 'none' });
		return 'keyword';		
	}
	if (this.token.type === this.readStatement)
	{
		if (this.blockStatements.hasOwnProperty(text) || this.terminalStatements.hasOwnProperty(text))
		{
			return 'keyword';
		}
		else if (this.expressionStatements.hasOwnProperty(text))
		{
			this.push({ type: this.readExpression, continuation: true, regexp: true });
			return 'keyword';
		}
	}
	if (this.locals.hasOwnProperty(text) || this.operators.hasOwnProperty(text))
	{
		this.token.regexp = false;
		return 'keyword';
	}
	else if (this.literals.hasOwnProperty(text))
	{
		return 'literal';
	}
	else if (text.length > 0)
	{
		this.token.continuation = false;
		this.token.regexp = false;
		return 'text';
	}
	this.textReader.read();
	return 'error';
};

JavaScript.prototype.readBlockStatement = function()
{
	if (this.textReader.match('}'))
	{
		if ((this.token.type === this.readBlockStatement) && (this.token.state !== 'root'))
		{
			this.pop();
			return 'punctuation';
		}
		return 'error';
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	else if (this.textReader.match(']') || this.textReader.match(')'))
	{
		return 'error';
	}

	this.push({ type: this.readStatement, continuation: true, regexp: true, start: true });
	return null;
};

JavaScript.prototype.readBlockExpression = function()
{
	if (this.textReader.match(',') || this.textReader.match(';'))
	{
		return 'punctuation';
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	this.push({ type: this.readExpression, continuation: true, regexp: true });
	return null;
};

JavaScript.prototype.readArray = function()
{
	if (this.textReader.match(']'))
	{
		this.pop();
		return 'punctuation';
	}
	else if (this.textReader.match('}') || this.textReader.match(')'))
	{
		return 'error';
	}
	return this.readBlockExpression();
};

JavaScript.prototype.readArguments = function()
{
	if (this.textReader.match(')'))
	{
		this.pop();
		return 'punctuation';
	}
	else if (this.textReader.match(']') || this.textReader.match('}'))
	{
		return 'error';
	}
	return this.readBlockExpression();
};

JavaScript.prototype.readObject = function()
{
	if (this.textReader.match('}'))
	{
		this.pop();
		return 'punctuation';
	}
	else if (this.textReader.match(']') || this.textReader.match(')'))
	{
		return 'error';
	}
	else if (this.textReader.skipWhitespaces() || this.textReader.skipLineTerminators())
	{
		return 'text';
	}
	else if (this.textReader.match(','))
	{
		this.token.identifier = true;
		return 'punctuation';
	}
	else if (this.token.identifier)
	{
		this.textReader.save();
		var identifier = this.readWord();
		if (identifier.length > 0)
		{
			this.textReader.skipWhitespaces();
			if (this.textReader.peek() === ':')
			{
				this.textReader.restore();
				this.readWord();
				return 'declaration';
			}
		}
		this.textReader.restore();
	}
	this.token.identifier = false;
	return this.readBlockExpression();
};

JavaScript.prototype.readFunction = function()
{
	if (this.token.state == 'block')
	{
		this.pop();
		return null;
	}
	else if (this.textReader.skipWhitespaces() || this.textReader.skipLineTerminators())
	{
		return 'text';
	}
	else if (this.token.state == 'name')
	{
		var c = this.textReader.peek();
		if (/[\w\$_]/.test(c))
		{
			this.token.name += this.textReader.read();
			return 'declaration';
		}
		this.token.state = 'next';
		return null;
	}
	else if (this.textReader.match('('))
	{
		this.token.state = 'parameters';
		this.push({ type: this.readParameters });
		return 'punctuation';
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	else if (this.textReader.match('{'))
	{
		this.token.state = 'block';
		this.push({ type: this.readBlockStatement, delimiter:'}' });
		return 'punctuation';
	}
	this.textReader.read();
	return 'error';
};

JavaScript.prototype.readParameters = function()
{
	if (this.textReader.match(')'))
	{
		this.pop();
		return 'punctuation';		
	}
	else if (this.textReader.match(','))
	{
		return 'punctuation';
	}
	else if (this.textReader.skipWhitespaces() || this.textReader.skipLineTerminators())
	{
		return 'text';
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	var text = this.readWord();
	if (text.length > 0)
	{
		return 'declaration';
	}
	this.textReader.read();
	return 'error';
};

JavaScript.prototype.readString = function()
{
	if (this.textReader.match('\\'))
	{
		this.token.value += '\\' + this.textReader.read();
	}
	else if (this.textReader.match(this.token.value[0]))
	{
		this.token.value += this.token.value[0];
		this.pop();
	}
	else
	{
		this.token.value += this.textReader.read();
	}
	return 'literal';
};

JavaScript.prototype.readNumber = function()
{
	var c = this.textReader.peek();
	if (c >= '0' && c <= '9')
	{
		this.token.value += this.textReader.read();
		return 'literal';
	}
	else if ((c == '.') && (this.token.comma) && (this.token.value !== '00'))
	{
		this.token.comma = false;
		this.token.value += this.textReader.read();
		return 'literal';
	}
	else if (c === 'E' || c === 'e')
	{
		this.token.comma = false;
		this.token.value += this.textReader.read();
		c = this.textReader.peek();
		if (c === '+' || c === '-')
		{
			this.token.value += this.textReader.read();
		}
		return 'literal';
	}
	this.pop();
	return null;
};

JavaScript.prototype.readHexNumber = function()
{
	var c = this.textReader.peek();
	if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))
	{
		this.token.value += this.textReader.read();
		return 'literal';
	}
	this.pop();
	return null;
};

JavaScript.prototype.readVariable = function()
{
	if (this.textReader.peek() === ';')
	{
		this.pop();
		return null;
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	else if (this.token.state === 'none')
	{
		if (this.textReader.skipLineTerminators() || this.textReader.skipWhitespaces())
		{
			return 'text';
		}
		this.token.state = 'name';
		this.token.name = this.textReader.read();
		return 'declaration';
	}
	else if (this.token.state === 'name')
	{
		if (this.textReader.skipLineTerminators() || this.textReader.skipWhitespaces())
		{
			this.token.state = 'next';
			return 'text';
		}
		else if ((this.textReader.peek() === ',') || (this.textReader.peek() === '='))
		{
			this.token.state = 'next';
			return null;
		}
		this.token.name += this.textReader.read();
		return 'declaration';
	}
	else if (this.token.state === 'next')
	{
		if (this.textReader.skipLineTerminators() || this.textReader.skipWhitespaces())
		{
			return 'text';
		}
		else if (this.textReader.match(','))
		{
			this.pop();
			this.push({ type: this.readVariable, state: 'none', name: '' });
			return 'punctuation';
		}
		else if (this.textReader.match('='))
		{
			this.token.state = 'expression';
			this.push({ type: this.readExpression, continuation: true, regexp: true });
			return 'punctuation';		
		}
		else if (this.textReader.match('in'))
		{
			this.pop();
			return 'keyword';
		}
	}
	else if (this.token.state === 'expression')
	{
		if (this.textReader.skipLineTerminators())
		{
			return null;
		}
		else if (this.textReader.skipWhitespaces())
		{
			return 'text';
		}
		else if (this.textReader.peek() === ',')
		{
			this.token.state = 'next';
			return null;
		}
	}
	this.pop();
	return null;
};

JavaScript.prototype.matchLiteral = function()
{
	this.textReader.save();
	var c = this.textReader.read();
	var value = c;
	if (c === "'" || c === '"')
	{
		// string literal
		this.push({ type: this.readString, value: value });
		return true;
	}
	var comma = true;
	if (c === '-')
	{
		// negative number
		c = this.textReader.read();
		value += c;
	}
	if ((c === '0') && (this.textReader.peek().toUpperCase() === 'X'))
	{
		// hex number
		value += this.textReader.read();
		this.push({ type: this.readHexNumber, value: value, comma: false });
		return true;
	}
	else if (c === '.')
	{
		// floating point
		c = this.textReader.read();
		value += c;
		comma = false;
	}
	if (c >= '0' && c <= '9')
	{
		this.push({ type: this.readNumber, value: value, comma: comma });
		return true;
	}
	this.textReader.restore();
	return false;
};

JavaScript.prototype.matchRegExp = function()
{
	this.textReader.save();
	if (this.token.regexp && this.textReader.match('/'))
	{
		while (this.textReader.peek() !== -1 && !this.textReader.skipLineTerminators())
		{
			if (this.textReader.match('\\'))
			{
				this.textReader.read();
			}
			else if (this.textReader.match('['))
			{
				var range = false;
				while (this.textReader.peek() !== -1 && !this.textReader.skipLineTerminators())
				{
					if (this.textReader.match(']'))
					{
						range = true;
						break;
					}
					this.textReader.match('\\');
					this.textReader.read();
				}
				if (!range)
				{
					break;
				}
			}
			else if (this.textReader.match('/'))
			{
				while (this.textReader.peek() !== -1 && this.regExpCommands.hasOwnProperty(this.textReader.peek()))
				{
					this.textReader.read();
				}
				return true;
			}
			else
			{
				this.textReader.read();
			}
		}
	}
	this.textReader.restore();
	return false;
};

JavaScript.prototype.matchBlockExpression = function()
{
	if (this.textReader.match('{'))
	{
		this.push({ type: this.readObject, identifier: true });
		return true;
	}
	else if (this.textReader.match('('))
	{
		this.push({ type: this.readArguments });
		return true;
	}
	else if (this.textReader.match('['))
	{
		this.push({ type: this.readArray });
		return true;
	}
	return false;
};

JavaScript.prototype.matchComment = function()
{
	if (this.textReader.match('//'))
	{
		this.push({ type: this.readLineComment });
		return true;
	}
	else if (this.textReader.match('/*'))
	{
		this.push({ type: this.readBlockComment });
		return true;
	}
	return false;
}

JavaScript.prototype.readWord = function()
{
	var word = '';
	var c;
	while (((c = this.textReader.peek()) !== -1) && (/[\w\$_]/.test(c)))
	{
		word += c;
		this.textReader.read();
	}
	return word;
};

JavaScript.prototype.terminate = function(terminator)
{
	if (this.textReader.match(terminator))
	{
		this.pop();
		return true;
	}
	this.textReader.read();
	return false;
};

JavaScript.prototype.popToken = function(tokenType)
{
	if ((this.tokenStack.length > 1) && (this.tokenStack[this.tokenStack.length - 1].type === tokenType))
	{
		this.pop();
	}	
};

JavaScript.prototype.push = function(token)
{
	this.tokenStack.push(token);
};

JavaScript.prototype.pop = function()
{
	this.tokenStack.pop();
};
