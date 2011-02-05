#!/bin/bash

rm -r ../Build
mkdir ../Build
mkdir ../Build/Debug
mkdir ../Build/Release

pushd ../Samples > /dev/null
cp demo_canvaspad.html ../Build/Debug/
cp demo_canvaspad.html ../Build/Release/
cp demo_javascript.html ../Build/Debug/
cp demo_javascript.html ../Build/Release/
cp demo_html.html ../Build/Debug/
cp demo_html.html ../Build/Release/
cp demo_css.html ../Build/Debug/
cp demo_css.html ../Build/Release/
popd > /dev/null

echo Building \'Debug/texteditor.js\'.
pushd ../Source/TextEditor > /dev/null
cat	Function.js \
	Array.js \
	Event.js \
	Point.js \
	Size.js \
	Rectangle.js \
	TextPosition.js \
	TextRange.js \
	ContainerUndoUnit.js \
	SelectionUndoUnit.js \
	TextUndoUnit.js \
	UndoService.js \
	TextReader.js \
	LanguageService.js \
	TextBuffer.js \
	TextModel.js \
	TextController.js \
	TextEditor.js \
	> ../../Build/Debug/texteditor.js
popd > /dev/null

echo Building \'Debug/javascript.js\'.
pushd ../Source/JavaScript > /dev/null
cat	JavaScript.js > ../../Build/Debug/javascript.js
popd > /dev/null

echo Building \'Debug/css.js\'.
pushd ../Source/Css > /dev/null
cat	Css.js > ../../Build/Debug/css.js
popd > /dev/null

echo Building \'Debug/html.js\'.
pushd ../Source/Html > /dev/null
cat	Html.js > ../../Build/Debug/html.js
popd > /dev/null

echo Building \'Release/texteditor.js\'.
java -jar compiler.jar --js ../Build/Debug/texteditor.js > ../Build/Release/texteditor.js
echo Building \'Release/css.js\'.
java -jar compiler.jar --js ../Build/Debug/css.js > ../Build/Release/css.js
echo Building \'Release/javascript.js\'.
java -jar compiler.jar --js ../Build/Debug/javascript.js > ../Build/Release/javascript.js
echo Building \'Release/html.js\'.
java -jar compiler.jar --js ../Build/Debug/html.js > ../Build/Release/html.js

echo Done.
