module Textor
{
    export class Rectangle
    {
        public x: number;
        public y: number;
        public width: number;
        public height: number;

        constructor(x: number, y: number, width: number, height: number)
        {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }

        public union(rectangle: Rectangle): Rectangle
        {
            var x1 = (this.x < rectangle.x) ? this.x : rectangle.x;
            var y1 = (this.y < rectangle.y) ? this.y : rectangle.y;
            var x2 = ((this.x + this.width) < (rectangle.x + rectangle.width)) ? (rectangle.x + rectangle.width) : (this.x + this.width);
            var y2 = ((this.y + this.height) < (rectangle.y + rectangle.height)) ? (rectangle.y + rectangle.height) : (this.y + this.height);
            return new Rectangle(x1, y1, x2 - x1, y2 - y1);
        }

        public toString(): string
        {
            return "(" + this.x + "," + this.y + ")-(" + this.width + "," + this.height + ")";
        }
    }
}
