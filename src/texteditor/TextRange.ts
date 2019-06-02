namespace Textor {
    export class TextRange {
        public start: TextPosition;
        public end: TextPosition;

        constructor(start: TextPosition, end: TextPosition) {
            this.start = start;
            this.end = end;
        }

        public get isEmpty(): boolean {
            return ((this.start.line === this.end.line) && (this.start.column === this.end.column));
        }

        public normalize(): TextRange {
            return (this.start.compareTo(this.end) > 0) ? new TextRange(this.end.clone(), this.start.clone()) : this.clone();
        }

        public clone(): TextRange {
            return new TextRange(this.start.clone(), this.end.clone());
        }

        public toString(): string {
            return this.start.toString() + "-" + this.end.toString();
        }
    }
}
