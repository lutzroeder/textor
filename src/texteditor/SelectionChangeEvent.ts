namespace Textor {

    export class SelectionChangeEvent {

        public oldRange: TextRange;
        public newRange: TextRange;

        constructor(oldRange: TextRange, newRange: TextRange) {
            this.oldRange = oldRange;
            this.newRange = newRange;
        }
    }
}
