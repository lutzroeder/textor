namespace Textor {
    export class TextPosition {
        public line: number;
        public column: number;

        constructor(line: number, column: number) {
            this.line = line;
            this.column = column;
        }

        public equals(position: TextPosition): boolean {
            return ((this.line === position.line) && (this.column === position.column));
        }

        public compareTo(position: TextPosition): number {
            const line: number = this.line - position.line;
            return (line === 0) ? (this.column - position.column) : line;
        }

        public clone() {
            return new TextPosition(this.line, this.column);
        }

        public toString(): string {
            return "(" + this.line + "," + this.column + ")";
        }
    }
}
