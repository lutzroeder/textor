declare module Textor
{
    interface ILanguage
    {
        begin(textReader: TextReader, state: string);
        read(): ILanguageStyle;
    }
}
