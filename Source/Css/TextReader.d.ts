declare module Textor
{
    class TextReader
    {
        peek(): string;
        read(): string;
        match(text: string): boolean;
        skipWhitespaces(): boolean;
        skipLineTerminators(): boolean;
    }
}