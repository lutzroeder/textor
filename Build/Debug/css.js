
var Css = function()
{
	this.textReader = null;
};

Css.prototype.begin = function(textReader, state)
{
	this.textReader = textReader;
	this.tokenStack = [{ type: this.readStylesheet, selector: 0, bracket: 0, literal: false, keyword: false, start: true }];
	this.token = null;
};

Css.prototype.read = function()
{
	this.state = null;
	this.token = this.tokenStack[this.tokenStack.length - 1];
	return { style: this.token.type.apply(this), state: this.state };
};

Css.prototype.readStylesheet = function()
{
	if (this.textReader.skipWhitespaces() || this.textReader.skipLineTerminators())
	{
		return 'text';
	}

	if (this.token.start && this.tokenStack.length === 1)
	{
		this.state = 'base';
		this.token.start = false;
	}

	if (this.textReader.match('{'))
	{
		this.token.start = true;
		if (!this.token.keyword)
		{
			this.push({ type: this.readBlock });
		}
		else
		{
			this.push({ type: this.readStylesheet, selector: 0, bracket: 0, literal: false, keyword: false });
		}
		this.token.keyword = false;
		return 'punctuation';
	}
	else if (this.textReader.match('}'))
	{
		if (this.tokenStack.length > 1)
		{
			this.pop();
			return 'punctuation';
		}
		this.state = null;
		return 'error';
	}
	else if (this.textReader.match('['))
	{
		this.token.selector++;
		this.token.literal = false;
		return 'punctuation';
	}
	else if (this.textReader.match('('))
	{
		this.token.bracket++;
		return 'punctuation';
	}
	else if (this.textReader.match(']'))
	{
		this.token.literal = false;
		if (this.token.selector > 0)
		{
			this.token.selector--;
			return 'punctuation';
		}
		return 'error';
	}
	else if (this.textReader.match(')'))
	{
		if (this.token.bracket > 0)
		{
			this.token.bracket--;
			return 'punctuation';
		}
		return 'error';
	}
	else if (this.textReader.match('='))
	{
		this.token.literal = true;
		return 'punctuation';
	}
	else if (this.textReader.match(';'))
	{
		this.token.keyword = false;
		return 'punctuation';	
	}
	else if (this.textReader.match(':') || this.textReader.match('#') || this.textReader.match('.') || this.textReader.match(',') || this.textReader.match('+') || this.textReader.match('*') || this.textReader.match('|') || this.textReader.match('>'))
	{
		return 'punctuation';		
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	else if (this.textReader.match('@'))
	{
		this.token.keyword = true;
		this.readWord();
		return 'keyword';
	}
	else if (this.matchString())
	{
		return 'literal';
	}

	var text = this.readWord();
	if (text.length > 0)
	{
		if ((this.token.bracket > 0) || ((this.token.selector > 0) && (this.token.literal)))
		{
			return 'literal';
		}
		if (this.token.selector > 0)
		{
			return 'attribute';
		}
		return 'element';
	}

	this.textReader.read();
	return 'text'; 
};

Css.prototype.readBlock = function()
{
	if (this.textReader.skipWhitespaces() || this.textReader.skipLineTerminators())
	{
		return 'text';
	}
	else if (this.textReader.match('}'))
	{
		this.pop();
		return 'punctuation';
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	else if (this.textReader.match(';'))
	{
		return 'punctuation';
	}
	else if (this.textReader.match(':'))
	{
		this.push({ type: this.readExpression });
		return 'punctuation';
	}

	var text = this.readWord();
	if (text.length > 0)
	{
		return 'attribute';
	}

	this.textReader.read();
	return 'text';
};

Css.prototype.readExpression = function()
{
	if (this.textReader.match(';'))
	{
		this.pop();
		return 'punctuation';
	}
	if (this.textReader.match(','))
	{
		this.pop();
		this.push({ type: this.readExpression });
		return 'punctuation';
	}
	else if (this.textReader.match('}'))
	{
		this.pop();
		this.pop();
		return 'punctuation';
	}
	else if (this.textReader.match('(') || this.textReader.match(')'))
	{
		return 'punctuation';
	}
	else if (this.matchComment())
	{
		return 'comment';
	}
	else if (this.matchString())
	{
		return 'literal';
	}
	else if (this.textReader.skipWhitespaces())
	{
		return 'text';
	}
	else if (this.textReader.match('url'))
	{
		return 'text';
	}

	this.textReader.read();
	return 'literal';
};

Css.prototype.readComment = function()
{
	this.terminate('*/');
	return 'comment';
};

Css.prototype.readString = function()
{
	if (this.textReader.match('\\'))
	{
		this.textReader.read();
	}
	else
	{
		this.terminate(this.token.quote);
	}
	return 'literal';
};

Css.prototype.readXmlComment = function()
{
	this.terminate('>');
	return 'comment';
};

Css.prototype.matchComment = function()
{
	if (this.textReader.match('/*'))
	{
		this.push({ type: this.readComment });
		return true;
	}
	else if (this.textReader.match('<!'))
	{
		this.push({ type: this.readXmlComment });
		return true;			
	}
	return false;
};

Css.prototype.matchString = function()
{
	var c = this.textReader.peek();
	if (c === "'" || c === '"')
	{
		this.textReader.read();
		this.push({ type: this.readString, quote: c });
		return true;
	}
	return false;
};

Css.prototype.readWord = function()
{
	var word = '';
	var c;
	while (((c = this.textReader.peek()) !== -1) && (/[\w\-\#$_]/.test(c)))
	{
		word += c;
		this.textReader.read();
	}
	return word;
};

Css.prototype.terminate = function(terminator)
{
	if (this.textReader.match(terminator))
	{
		this.pop();
		return true;
	}
	this.textReader.read();
	return false;
};

Css.prototype.push = function(token)
{
	this.tokenStack.push(token);
};

Css.prototype.pop = function()
{
	this.tokenStack.pop();
};
