
var Html = function()
{
	if (arguments.length === 0)
	{
		this.languages = [];
	}
	if (arguments.length === 1)
	{
		// mixed content languages by mime-type
		this.languages = arguments[0];
	}
};

Html.prototype.begin = function(textReader, state)
{
	this.textReader = textReader;
	this.tokenStack = [{ type: this.readText }];

	// used for mixed content in JavaScript or CSS
	this.languageToken = null;

	if (state !== null)
	{
		var states = state.split(':');
		if (states.length > 1)
		{
			var mimeType = states[0];
			var closeTag = states[1];
			var language = this.languages[mimeType];
			if (language)
			{
				language.begin(this.textReader, states[2]);
				this.push({ type: this.readLanguage, mimeType: mimeType, language: language, closeTag: closeTag, contentData: 0 });
			}
		}
	}
};

Html.prototype.read = function()
{
	this.state = null;
	this.token = this.tokenStack[this.tokenStack.length - 1];
	if (this.token.type === this.readLanguage)
	{
		return this.token.type.apply(this);
	}
	return { style: this.token.type.apply(this), state: this.state };
};

Html.prototype.readText = function()
{
	if (this.textReader.match('<'))
	{
		if (this.tokenStack.length === 1)
		{
			this.state = 'base';
		}
		if (this.textReader.match('!'))
		{
			if (this.textReader.match('--'))
			{
				// comment
				this.push({ type: this.readComment });
				return 'comment';
			}
			else if (this.textReader.match('[CDATA['))
			{
				// constant data
				this.push({ type: this.readConstantData });
				return 'literal';
			}
			else
			{
				// doc type
				this.push({ type: this.readDocType });
				return 'punctuation';
			}
		}
		else if (this.textReader.match('?'))
		{
			// processing instruction
			this.push({ type: this.readProcessingInstruction });
			return 'punctuation';
		}
		else if (this.textReader.match('/'))
		{
			// close tag
			this.push({ type: this.readEndTag });
			return 'punctuation';
		}
		else
		{
			// open tag
			this.push({ type: this.readStartTag, name: '', hasAttributes: false });
			return 'punctuation';
		}
	}
	else if (this.textReader.match('&'))
	{
		// entity
		this.push({ type: this.readEntity });
		return 'literal';
	}
	this.textReader.read();
	return 'text';
};

Html.prototype.readStartTag = function()
{
	if (this.textReader.skipWhitespaces())
	{
		this.token.hasAttributes = true;
		this.push({ type: this.readAttribute, name: '', hasValue: false });
		return 'text';
	}
	if (this.textReader.match('>') || (this.textReader.match('/>')))
	{
		this.pop();
		this.setLanguage();
		return 'punctuation';
	}
	c = this.textReader.read();
	if (!this.token.hasAttributes)
	{
		this.token.name += c;
	}
	return 'element';
};

Html.prototype.readEndTag = function()
{
	if (this.textReader.match('>'))
	{
		this.pop();
		return 'punctuation';
	}
	this.token.name += this.textReader.read();
	return 'element';
};

Html.prototype.readAttribute = function()
{
	if (this.textReader.skipWhitespaces())
	{
		return 'text';
	}
	else if (this.textReader.match('>'))
	{
		this.pop();
		this.pop();
		this.setLanguage();
		return 'punctuation';
	}
	else if (this.textReader.match('='))
	{
		this.push({ type: this.readAttributeValue, value: '', quote: '' });
		this.token.hasValue = true;
		return 'punctuation';
	}
	c = this.textReader.peek();
	if (c === '/')
	{
		this.pop();
		return 'punctuation';
	}
	this.textReader.read();
	if (!this.token.hasValue)
	{
		this.token.name += c;
	}
	return 'attribute';
};

Html.prototype.readAttributeValue = function()
{
	c = this.textReader.peek();
	if (this.token.quote === '')
	{
		if (c === "'")
		{
			this.textReader.read();
			this.token.quote = 's'; // single-quote
			return 'literal';
		}
		else if (c === '"')
		{
			this.textReader.read();
			this.token.quote = 'd'; // double-quote
			return 'literal';
		}
		else if (this.textReader.skipWhitespaces())
		{
			return 'text';
		}
		else
		{
			this.token.quote = '-'; // none
		}
	}

	var closeTag = false;
	var style = '';

	if (this.token.quote === 's' && c === "'")
	{
		this.textReader.read();
		this.pop();
		style = 'literal';
	}
	else if (this.token.quote === 'd' && c === '"')
	{
		this.textReader.read();
		this.pop();
		style = 'literal';
	}
	else if (this.token.quote === '-' && this.textReader.skipWhitespaces())
	{
		this.pop();
		style = 'text';
	}
	else if (this.token.quote === '-' && c === '>')
	{
		this.textReader.read();
		this.pop();
		closeTag = true;
		style = 'punctuation';
	}

	if (style.length === 0)
	{
		this.token.value += this.textReader.read();
		return 'literal';
	}

	// check if element has mixed content
	attributeName = this.tokenStack[this.tokenStack.length - 1].name.toUpperCase();
	elementName = this.tokenStack[this.tokenStack.length - 2].name.toUpperCase();
	if ((attributeName === 'TYPE' && elementName === 'SCRIPT') || (attributeName === 'TYPE' && elementName === 'STYLE'))
	{
		var mimeType = this.token.value;
		var language = this.languages[mimeType];
		if (language)
		{
			language.begin(this.textReader, null);
			this.languageToken = { type: this.readLanguage, mimeType: mimeType, language: language, closeTag: '</' + elementName + '>', contentData: 0 };
		}
	}

	// pop attribute
	this.pop();
	if (closeTag)
	{
		// pop start tag
		this.pop();
		this.setLanguage();
	}
	else
	{
		// next attribute
		this.push({ type: this.readAttribute, name: '', value: false });
	}

	return style;
};

Html.prototype.readComment = function()
{
	this.terminate('-->');
	return 'comment';
};

Html.prototype.readConstantData = function()
{
	this.terminate(']]>');
	return 'literal';
};

Html.prototype.readEntity = function()
{
	c = this.textReader.read();
	if ((c === '\n') || (c === ';'))
	{
		this.pop();
	}
	return 'literal';
};

Html.prototype.readDocType = function()
{
	return this.terminate('>') ? 'punctuation' : 'element';
};

Html.prototype.readProcessingInstruction = function()
{
	return this.terminate('?>') ? 'punctuation' : 'literal';
};

Html.prototype.readLanguage = function()
{
	c = this.textReader.peek();
	if (c === '<' || c === ']')
	{
		if (this.testIgnoreCase('<![CDATA['))
		{
			this.token.contentData++;
		}
		else if (this.testIgnoreCase(']]>') && (this.token.contentData > 0))
		{
			this.token.contentData--;
		}

		// check for </style> or </script> end tag.
		if ((this.token.contentData == 0) && this.testIgnoreCase(this.token.closeTag))
		{
			this.pop();
			return this.read();
		}
	}

	var result = this.token.language.read();
	result.state = (result.state !== null) ? (this.token.mimeType + ':' + this.token.closeTag + ':' + result.state) : null;
	return result;
};

Html.prototype.push = function(token)
{
	this.tokenStack.push(token);
};

Html.prototype.pop = function()
{
	this.tokenStack.pop();
};

Html.prototype.setLanguage = function()
{
	if (this.languageToken !== null)
	{
		this.push(this.languageToken);
		this.languageToken = null;
	}
};

Html.prototype.terminate = function(terminator)
{
	if (this.textReader.match(terminator))
	{
		this.pop();
		return true;
	}
	this.textReader.read();
	return false;
};

Html.prototype.testIgnoreCase = function(text)
{
	this.textReader.save();
	for (var i = 0; i < text.length; i++)
	{
		c = this.textReader.read();
		if ((c === -1) || (c.toUpperCase() !== text[i].toUpperCase()))
		{
			this.textReader.restore();
			return false;
		}
	}
	this.textReader.restore();
	return true;
};
