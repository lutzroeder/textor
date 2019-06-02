namespace Textor {

    export class ThemeManager implements IThemeManager {

        private _themes: { [s: string]: ITheme; } = {};

        constructor() {
            this.add("default", {
                attributeStyle: "#0000AA italic",
                backgroundBlurColor: "#ffffff",
                backgroundColor: "#ffffff",
                commentStyle: "#0068c5 italic",
                cursorBackgroundColor: "#ededed",
                cursorColor: "#000000",
                declarationStyle: "#000000 bold",
                elementStyle: "#0000AA bold",
                errorStyle: "#FF0000 bold",
                fontFamily: "Menlo,Consolas,Courier New",
                fontSize: "13",
                keywordStyle: "#662266 bold",
                literalStyle: "#005a15",
                paddingLeft: "4",
                paddingTop: "4",
                punctuationStyle: "#666666",
                selectionBlurColor: "#e3f1fe",
                selectionColor: "#c0ddf6",
                textStyle: "#000000",
            });

            this.add("dark", {
                attributeStyle: "#CCCCCC italic",
                backgroundBlurColor: "#000000",
                backgroundColor: "#22252A",
                commentStyle: "#AAAAAA italic",
                cursorBackgroundColor: "#33373F",
                cursorColor: "#FFFFFF",
                declarationStyle: "#FFFFFF italic",
                elementStyle: "#CCCCCC bold",
                errorStyle: "AA0000 bold",
                fontFamily: "Menlo,Consolas,Courier New",
                fontSize: "13",
                keywordStyle: "#82A0C0",
                literalStyle: "#997777",
                paddingLeft: "4",
                paddingTop: "4",
                punctuationStyle: "#888888",
                selectionBlurColor: "#33373F",
                selectionColor: "#3C424C",
                textStyle: "#FFFFFF",
            });

            this.add("gray", {
                attributeStyle: "#AAAAAA bold",
                backgroundBlurColor: "#000000",
                backgroundColor: "#202020",
                commentStyle: "#AAAAAA italic",
                cursorBackgroundColor: "#333333",
                cursorColor: "#FFFFFF",
                declarationStyle: "#FFFFFF italic",
                elementStyle: "#CCCCCC bold",
                errorStyle: "#AA0000 bold",
                fontFamily: "Menlo,Consolas,Courier New",
                fontSize: "13",
                keywordStyle: "#808880 bold",
                literalStyle: "#998888",
                paddingLeft: "4",
                paddingTop: "4",
                punctuationStyle: "#888888",
                selectionBlurColor: "#282828",
                selectionColor: "#383838",
                textStyle: "#FFFFFF",
            });
        }

        public add(name: string, theme: ITheme) {
            this._themes[name] = theme;
        }

        public remove(name: string) {
            delete this._themes[name];
        }

        public get(name: string): ITheme {
            return this._themes[name];
        }
    }
}
