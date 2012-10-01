module Textor
{
	export interface ILanguage
	{
		begin(textReader: TextReader, state: string);
		read(): ILanguageStyle;
	}
}
