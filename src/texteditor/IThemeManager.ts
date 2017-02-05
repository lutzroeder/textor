module Textor
{
    export interface IThemeManager
    {
        add(name: string, theme: ITheme);
        remove(name: string);
        get(name: string): ITheme
    }
}