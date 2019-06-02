namespace Textor {

    export class TextChangeEvent {

        public oldRange: TextRange;
        public newRange: TextRange;
        public text: string;

        constructor(oldRange: TextRange, newRange: TextRange, text: string) {
            this.oldRange = oldRange;
            this.newRange = newRange;
            this.text = text;
        }
    }
}
