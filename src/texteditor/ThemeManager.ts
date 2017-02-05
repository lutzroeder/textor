module Textor
{
    export class ThemeManager implements IThemeManager
    {
        private _themes: { [s: string]: ITheme; } = {};

        constructor()
        {
            this.add("default", {
                "fontFamily": "Menlo,Consolas,Courier New",
                "fontSize": "13",
                "paddingLeft": "4",
                "paddingTop": "4",
                "backgroundColor": "#ffffff",
                "backgroundBlurColor": "#ffffff",
                "selectionColor": "#c0ddf6",
                "selectionBlurColor": "#e3f1fe",
                "cursorColor": "#000000",
                "cursorBackgroundColor": "#ededed",
                "textStyle": "#000000",
                "punctuationStyle": "#666666",
                "commentStyle": "#0068c5 italic",
                "keywordStyle": "#662266 bold",
                "literalStyle": "#005a15",
                "elementStyle": "#0000AA bold",
                "attributeStyle": "#0000AA italic",
                "errorStyle": "#FF0000 bold",
                "declarationStyle": "#000000 bold" });

            this.add("dark", {
                "fontFamily": "Menlo,Consolas,Courier New",
                "fontSize": "13",
                "paddingLeft": "4",
                "paddingTop": "4",
                "backgroundColor": "#22252A",
                "backgroundBlurColor": "#000000",
                "selectionColor": "#3C424C",
                "selectionBlurColor": "#33373F",
                "cursorColor": "#FFFFFF",
                "cursorBackgroundColor": "#33373F",
                "textStyle": "#FFFFFF",
                "commentStyle": "#AAAAAA italic",
                "literalStyle": "#997777",
                "elementStyle": "#CCCCCC bold",
                "attributeStyle": "#CCCCCC italic",
                "keywordStyle": "#82A0C0",
                "punctuationStyle": "#888888",
                "declarationStyle": "#FFFFFF italic",
                "errorStyle": "AA0000 bold" });

            this.add("gray", {
                "fontFamily": "Menlo,Consolas,Courier New",
                "fontSize": "13",
                "paddingLeft": "4",
                "paddingTop": "4",
                "backgroundColor": "#202020",
                "backgroundBlurColor": "#000000",
                "selectionColor": "#383838", 
                "selectionBlurColor": "#282828", 
                "cursorColor": "#FFFFFF", 
                "cursorBackgroundColor": "#333333",
                "textStyle": "#FFFFFF", 
                "commentStyle": "#AAAAAA italic",
                "literalStyle": "#998888",
                "keywordStyle": "#808880 bold",
                "punctuationStyle": "#888888",
                "declarationStyle": "#FFFFFF italic",
                "attributeStyle": "#AAAAAA bold",
                "elementStyle": "#CCCCCC bold",
                "errorStyle": "#AA0000 bold" });
        }

        public add(name: string, theme: ITheme)
        {
            this._themes[name] = theme;
        }

        public remove(name: string)
        {
            delete this._themes[name];
        }

        public get(name: string): ITheme
        {
            return this._themes[name];
        }
    }
}
