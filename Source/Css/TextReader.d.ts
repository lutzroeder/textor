declare module Textor
{
	class TextReader
	{
		peek(): string;
		read(): string;
		match(text: string): bool;
		skipWhitespaces(): bool;
		skipLineTerminators(): bool;
	}
}