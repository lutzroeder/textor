
interface Array<T>
{
    remove(obj: any);
}

Array.prototype.remove = function(obj)
{
    var i = this.length;
    while (i--)
    {
        if (this[i] == obj)
        {
            this.splice(i, 1);
        }
    }
}
