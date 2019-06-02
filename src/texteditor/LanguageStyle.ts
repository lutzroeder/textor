namespace Textor {

    export class LanguageStyle implements ILanguageStyle {

        public style: string;
        public state: string;
        public start: number;

        constructor(style: string, state: string, start: number) {
            this.style = style;
            this.state = state;
            this.start = start;
        }
    }
}
