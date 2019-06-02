declare namespace Textor
{
    interface ILanguage
    {
        begin(textReader: ITextReader, state: string): void;
        read(): ILanguageStyle;
    }
}
