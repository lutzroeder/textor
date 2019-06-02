namespace Textor {

    export interface IThemeManager {
        add(name: string, theme: ITheme): void;
        remove(name: string): void;
        get(name: string): ITheme;
    }
}
