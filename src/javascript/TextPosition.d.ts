declare module Textor
{
    class TextPosition
    {
        line: number;
        column: number;

        equals(position: TextPosition): boolean;
        compareTo(position: TextPosition): number;
        clone();
        toString(): string;
    }
}