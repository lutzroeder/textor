module Textor
{
    export interface TextChangeHandler
    {
        (e: TextChangeEvent): void;
    }
}
