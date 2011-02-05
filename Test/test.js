
f1 = function(e) { }

f2 = function(e) { }
break;

// var without semicolon
var a = []
function f()
{
}

var b = function() { return [ { alpha:/^[^*\/]+/, beta:'x' }, { } ]; };

// comments in variable declaration
var x, // comment
	y, // comment
	z

// division instead of regexp
x = []/1/1;
x = {}/1/1;
false ? [] : {}/1/1;
	
// var in block statement
if (true) { var t = f("x") }
	
// comma separated statements
if (true) 
{
    temp = b, b = a, a = temp;
}

f({ "x": "y"});

// object initializer at end of file
x = {}
