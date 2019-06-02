declare namespace Textor
{
    interface ITextReader
    {
        peek(): string;
        read(): string;
        match(text: string): boolean;
        skipWhitespaces(): boolean;
        skipLineTerminators(): boolean;
        save();
        restore();
    }
}