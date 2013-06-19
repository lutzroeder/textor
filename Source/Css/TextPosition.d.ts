declare module Textor
{
	class TextPosition
	{
		line: number;
	 	column: number;

		equals(position: TextPosition): bool;
		compareTo(position: TextPosition): number;
		clone();
		toString(): string;
	}
}