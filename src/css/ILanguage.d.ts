declare module Textor
{
    interface ILanguage
    {
        begin(textReader: TextReader, state: string): void;
        read(): ILanguageStyle;
    }
}
