declare module Textor
{
    interface ILanguage
    {
        begin(textReader: ITextReader, state: string);
        read(): ILanguageStyle;
    }
}
