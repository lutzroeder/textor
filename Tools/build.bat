@echo off

pushd %~dp0

rd /s /q ..\Build
md ..\Build\Debug
md ..\Build\Release

copy ..\Samples\demo_canvaspad.html ..\Build\Debug\
copy ..\Samples\demo_canvaspad.html ..\Build\Release\
copy ..\Samples\demo_javascript.html ..\Build\Debug\
copy ..\Samples\demo_javascript.html ..\Build\Release\
copy ..\Samples\demo_html.html ..\Build\Debug\
copy ..\Samples\demo_html.html ..\Build\Release\
copy ..\Samples\demo_css.html ..\Build\Debug\
copy ..\Samples\demo_css.html ..\Build\Release\

echo Building 'Debug\texteditor.js'.
set Source=
for %%i in ("..\Source\TextEditor\*.ts") do call set Source=%%Source%% %%i
node tsc.js -target ES5 -out ..\Build\Debug\texteditor.js ..\Library\lib.d.ts libex.d.ts %Source%

if not exist "..\Build\Debug\texteditor.js" goto :Done

echo Building 'Debug\javascript.js\'.
set Source=
for %%i in ("..\Source\JavaScript\*.ts") do call set Source=%%Source%% %%i
node tsc.js -target ES5 -out ..\Build\Debug\javascript.js ..\Library\lib.d.ts %Source%
echo Building 'Debug\css.js\'.
set Source=
for %%i in ("..\Source\Css\*.ts") do call set Source=%%Source%% %%i
node tsc.js -target ES5 -out ..\Build\Debug\css.js ..\Library\lib.d.ts %Source%
echo Building 'Debug\html.js\'.
set Source=
for %%i in ("..\Source\Html\*.ts") do call set Source=%%Source%% %%i
node tsc.js -target ES5 -out ..\Build\Debug\html.js ..\Library\lib.d.ts %Source%

echo Building 'Release\texteditor.js'.
node minify.js ..\Build\Debug\texteditor.js ..\Build\Release\texteditor.js
echo Building 'Release\css.js'.
node minify.js ..\Build\Debug\css.js ..\Build\Release\css.js
echo Building 'Release\javascript.js'.
node minify.js ..\Build\Debug\javascript.js ..\Build\Release\javascript.js
echo Building 'Release\html.js'.
node minify.js ..\Build\Debug\html.js ..\Build\Release\html.js

popd

:Done
echo Done.
