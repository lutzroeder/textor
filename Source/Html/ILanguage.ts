module Textor
{
	export interface ILanguage
	{
		begin(textReader: TextReader, state: string): void;
		read(): ILanguageStyle;
	}
}
