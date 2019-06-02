namespace Textor {

    export class TextController {

        public get isMozilla(): boolean {
            return this._isMozilla;
        }

        private _textEditor: TextEditor;
        private _canvas: HTMLCanvasElement;
        private _isWebKit: boolean;
        private _isChrome: boolean;
        private _isMozilla: boolean;
        private _isMac: boolean;
        private _textArea: HTMLTextAreaElement;
        private _scrollTimer: number;
        private _mouseCapture: boolean;
        private _pointerPosition: Point;
        private _keyCodeTable: any;
        private _canvas_mouseDownHandler: (e: MouseEvent) => void;
        private _window_mouseUpHandler: (e: MouseEvent) => void;
        private _window_mouseMoveHandler: (e: MouseEvent) => void;
        private _canvas_mouseWheelHandler: (e: MouseWheelEvent) => void;
        private _canvas_touchStartHandler: (e: TouchEvent) => void;
        private _canvas_touchEndHandler: (e: TouchEvent) => void;
        private _canvas_touchMoveHandler: (e: TouchEvent) => void;
        private _canvas_focusHandler: (e: FocusEvent) => void;
        private _textArea_keyUpHandler: (e: KeyboardEvent) => void;
        private _textArea_keyDownHandler: (e: KeyboardEvent) => void;
        private _textArea_keyPressHandler: (e: KeyboardEvent) => void;
        private _textArea_focusHandler: (e: FocusEvent) => void;
        private _textArea_blurHandler: (e: FocusEvent) => void;
        private _textArea_cutHandler: (e: DragEvent) => void;
        private _textArea_copyHandler: (e: DragEvent) => void;
        private _textArea_pasteHandler: (e: DragEvent) => void;
        private _textArea_beforeCutHandler: (e: DragEvent) => void;
        private _textArea_beforeCopyHandler: (e: DragEvent) => void;

        constructor(textEditor: TextEditor, canvas: HTMLCanvasElement) {
            this._textEditor = textEditor;
            this._canvas = canvas;

            this._isWebKit = typeof navigator.userAgent.split("WebKit/")[1] !== "undefined";
            this._isChrome = navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
            this._isMozilla = navigator.appVersion.indexOf("Gecko/") >= 0 || ((navigator.userAgent.indexOf("Gecko") >= 0) && !this._isWebKit && (typeof navigator.appVersion !== "undefined"));
            this._isMac = /Mac/.test(navigator.userAgent);

            this._textArea = document.createElement("textarea") as HTMLTextAreaElement;
            this._textArea.style.position = "absolute";
            this._textArea.style.top = "0";
            this._textArea.style.left = "0";
            this._textArea.style.width = "0";
            this._textArea.style.height = "0";
            this._textArea.style.zIndex = "-99999";
            this._textArea.style.margin = "0";
            this._textArea.style.border = "0";
            this._textArea.style.padding = "1px";
            this._textArea.style.resize = "none";
            this._textArea.style.outline = "none";
            this._textArea.style.overflow = "hidden";
            this._textArea.style.background = "none";
            this._textArea.value = ".";
            document.body.appendChild(this._textArea);
            this.updateTextAreaPosition();

            this._canvas_mouseDownHandler = (e: MouseEvent) => { this.canvas_mouseDown(e); };
            this._canvas_mouseWheelHandler = (e: MouseWheelEvent) => { this.canvas_mouseWheel(e); };
            this._canvas_touchStartHandler = (e: TouchEvent) => { this.canvas_touchStart(e); };
            this._canvas_focusHandler = (e: FocusEvent) => { this.canvas_focus(e); };
            this._window_mouseUpHandler = (e: MouseEvent) => { this.window_mouseUp(e); };
            this._window_mouseMoveHandler = (e: MouseEvent) => { this.window_mouseMove(e); };
            this._canvas_touchEndHandler = (e: TouchEvent) => { this.canvas_touchEnd(e); };
            this._canvas_touchMoveHandler = (e: TouchEvent) => { this.canvas_touchMove(e); };
            this._textArea_keyUpHandler = (e: KeyboardEvent) => { this.textArea_keyUp(e); };
            this._textArea_keyDownHandler = (e: KeyboardEvent) => { this.textArea_keyDown(e); };
            this._textArea_keyPressHandler = (e: KeyboardEvent) => { this.textArea_keyPress(e); };
            this._textArea_focusHandler = (e: FocusEvent) => { this.textArea_focus(e); };
            this._textArea_blurHandler = (e: FocusEvent) => { this.textArea_blur(e); };
            this._textArea_cutHandler = (e: DragEvent) => { this.textArea_cut(e); };
            this._textArea_copyHandler = (e: DragEvent) => { this.textArea_copy(e); };
            this._textArea_pasteHandler = (e: DragEvent) => { this.textArea_paste(e); };
            this._textArea_beforeCutHandler = (e: DragEvent) => { this.textArea_beforeCut(e); };
            this._textArea_beforeCopyHandler = (e: DragEvent) => { this.textArea_beforeCopy(e); };

            this._canvas.addEventListener("focus", this._canvas_focusHandler, false);
            this._canvas.addEventListener(("onmousewheel" in this._canvas) ? "mousewheel" : "DOMMouseScroll", this._canvas_mouseWheelHandler, false);
            this._canvas.addEventListener("touchstart", this._canvas_touchStartHandler, false);
            this._canvas.addEventListener("touchmove", this._canvas_touchMoveHandler, false);
            this._canvas.addEventListener("touchend", this._canvas_touchEndHandler, false);
            this._canvas.addEventListener("mousedown", this._canvas_mouseDownHandler, false);
            window.addEventListener("mousemove", this._window_mouseMoveHandler, false);
            window.addEventListener("mouseup", this._window_mouseUpHandler, false);

            this._textArea.addEventListener("focus", this._textArea_focusHandler, false);
            this._textArea.addEventListener("blur", this._textArea_blurHandler, false);
            this._textArea.addEventListener("cut", this._textArea_cutHandler, false);
            this._textArea.addEventListener("copy", this._textArea_copyHandler, false);
            this._textArea.addEventListener("paste", this._textArea_pasteHandler, false);
            this._textArea.addEventListener("beforecut", this._textArea_beforeCutHandler, false);
            this._textArea.addEventListener("beforecopy", this._textArea_beforeCopyHandler, false);
            this._textArea.addEventListener("keydown", this._textArea_keyDownHandler, false);
            this._textArea.addEventListener("keypress", this._textArea_keyPressHandler, false);
            this._textArea.addEventListener("keyup", this._textArea_keyUpHandler, false);
        }

        public dispose() {
            window.removeEventListener("mousemove", this._window_mouseMoveHandler);
            window.removeEventListener("mouseup", this._window_mouseUpHandler);
            this._canvas.removeEventListener("mousedown", this._canvas_mouseDownHandler);
            this._canvas.removeEventListener("touchend", this._canvas_touchEndHandler);
            this._canvas.removeEventListener("touchmove", this._canvas_touchMoveHandler);
            this._canvas.removeEventListener("touchstart", this._canvas_touchStartHandler);
            this._canvas.removeEventListener("focus", this._canvas_focusHandler);
            this._canvas.removeEventListener(("onmousewheel" in this._canvas) ? "mousewheel" : "DOMMouseScroll", this._canvas_mouseWheelHandler, false);
            this._textArea.removeEventListener("focus", this._textArea_focusHandler);
            this._textArea.removeEventListener("blur", this._textArea_blurHandler);
            this._textArea.removeEventListener("cut", this._textArea_cutHandler);
            this._textArea.removeEventListener("copy", this._textArea_copyHandler);
            this._textArea.removeEventListener("paste", this._textArea_pasteHandler);
            this._textArea.removeEventListener("beforecut", this._textArea_beforeCutHandler);
            this._textArea.removeEventListener("beforecopy", this._textArea_beforeCopyHandler);
            this._textArea.removeEventListener("keypress", this._textArea_keyPressHandler);
            this._textArea.removeEventListener("keyup", this._textArea_keyUpHandler);
            this._textArea.removeEventListener("keydown", this._textArea_keyDownHandler);
        }

        public isFocused() {
            return new RegExp("(^|\\s+)" + "focus" + "(\\s+|$)").test(this._canvas.className);
        }

        public focus() {
            this._textArea.focus();
        }

        public copy(text: string) {
            if (this._isMozilla || this._isWebKit) {
                this._textArea.value = text;
                this._textArea.select();
            }
        }

        public updateTextAreaPosition() {
            // hide the textarea under the canvas control
            const point = new Point(0, 0);
            let node: HTMLElement = this._canvas;
            while (node !== null) {
                point.x += node.offsetLeft;
                point.y += node.offsetTop;
                node = node.offsetParent as HTMLElement;
            }
            this._textArea.style.top = point.y + "px";
            this._textArea.style.left = point.x + "px";
        }

        private textArea_cut(e: DragEvent) {
            this._textEditor.cut();
        }

        private textArea_copy(e: DragEvent) {
            this._textEditor.copy();
        }

        private textArea_paste(e: DragEvent) {
            if (this._isMozilla) {
                this._textArea.value = "";
                window.setTimeout(function() {
                    const text = this._textArea.value;
                    if (text.length > 0) {
                        this._textEditor.paste(text);
                    }
                }.bind(this), 1);
            } else if (this._isWebKit) {
                const text = e.clipboardData.getData("text/plain");
                this._textEditor.paste(text);
                this.stopEvent(e);
            }
        }

        private textArea_beforeCut(e: DragEvent) {
            // select text in the text area so the cut event will fire.
            this._textEditor.copy();
        }

        private textArea_beforeCopy(e: DragEvent) {
            this._textEditor.copy();
        }

        private textArea_focus(e: FocusEvent) {
            if (!this.isFocused()) {
                this._canvas.className += " focus";
            }

            this._textArea.select();
            this._textEditor.invalidate();
            this._textEditor.update();
        }

        private textArea_blur(e: FocusEvent) {
            if (this.isFocused()) {
                this._canvas.className = this._canvas.className.replace(new RegExp(" focus\\b"), "");
            }
            this._textEditor.invalidate();
            // TODO calling update() will cause IE9 Beta1 to flicker
        }

        private canvas_focus(e: FocusEvent) {
            this._textEditor.focus();
        }

        private canvas_mouseDown(e: MouseEvent) {
            this._textEditor.focus();

            this.stopEvent(e);
            this.updatePointerPosition(e.pageX, e.pageY);

            const position = this.getTextPosition();

            const clicks = ((e.detail - 1) % 3) + 1;
            if (clicks === 1) {
                if (!e.shiftKey) {
                    this.pointerDown();
                } else {
                    this._textEditor.selectTo(position.line, position.column);
                }

                this._mouseCapture = true;
                this.startScrollTimer();
            } else if (clicks === 2) {
                // select word at position
                this._textEditor.selectWord(position.line, position.column);
                this._mouseCapture = true;
                this.startScrollTimer();
            } else if (clicks === 3) {
                this._textEditor.selectRange(position.line, 0, position.line + 1, 0);
            }

            this.updateMouseCursor();
        }

        private window_mouseUp(e: MouseEvent) {
            e.preventDefault();
            this.updatePointerPosition(e.pageX, e.pageY);
            this.pointerUp();
        }

        private window_mouseMove(e: MouseEvent) {
            e.preventDefault();
            this.updatePointerPosition(e.pageX, e.pageY);
            this.pointerMove();
        }

        private canvas_mouseWheel(e: MouseWheelEvent) {
            e.preventDefault();

            let delta: number = 0;

            if (!e) {
                delta = window.event.wheelDelta / 120;
            }

            if (e.wheelDelta) {
                delta = e.wheelDelta / 120;
            } else if (e.detail) {
                delta = -e.detail / 3;
            }

            if (delta !== 0) {
                this._textEditor.scroll(Math.floor(-delta), 0);
                this._textEditor.update();
            }
        }

        private canvas_touchStart(e: TouchEvent) {
            this._textEditor.focus();
            if (e.touches.length === 1) {
                e.preventDefault();
                this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
                this.pointerDown();
            }
        }

        private canvas_touchMove(e: TouchEvent) {
            if (e.touches.length === 1) {
                e.preventDefault();
                this.updatePointerPosition(e.touches[0].pageX, e.touches[0].pageY);
                this.pointerMove();
            }
        }

        private canvas_touchEnd(e: TouchEvent) {
            e.preventDefault();
            this.pointerUp();
        }

        private textArea_keyUp(e: KeyboardEvent) {
            e.preventDefault();
        }

        private textArea_keyDown(e: KeyboardEvent) {
            if (!this._isMozilla) {
                if (this.processKey(e.keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey)) {
                    this._textEditor.update();
                    this.stopEvent(e);
                }
            }
        }

        private textArea_keyPress(e: KeyboardEvent) {
            if (this._isMozilla) {
                if (!(this._keyCodeTable)) {
                    this._keyCodeTable = [];
                    const charCodeTable: any = {
                        32: " ",  48: "0",  49: "1",  50: "2",  51: "3",  52: "4", 53:  "5",  54: "6",  55: "7",  56: "8",  57: "9",  59: ";",  61: "=",
                        65:  "a", 66: "b",  67: "c",  68: "d",  69: "e",  70: "f",  71: "g", 72:  "h",  73: "i",  74: "j",  75: "k",  76: "l",  77: "m",  78: "n", 79:  "o", 80: "p",  81: "q",  82: "r",  83: "s",  84: "t",  85: "u", 86: "v", 87: "w",  88: "x",  89: "y",  90: "z",
                        107: "+", 109: "-", 110: ".", 188: ",", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: '\"',
                    };

                    for (const code of Object.keys(charCodeTable)) {
                        const key = charCodeTable[code];
                        this._keyCodeTable[key.charCodeAt(0)] = parseInt(code, 10);
                        if (key.toUpperCase() !== key) {
                            this._keyCodeTable[key.toUpperCase().charCodeAt(0)] = parseInt(code, 10);
                        }
                    }
                }

                const keyCode = ((e.charCode !== 0) && (this._keyCodeTable[e.charCode])) ? this._keyCodeTable[e.charCode] : e.keyCode;
                if (this.processKey(keyCode, e.shiftKey, e.ctrlKey, e.altKey, e.metaKey)) {
                    this._textEditor.update();
                    this.stopEvent(e);
                    return;
                }
            }

            // When ctrlKey and altKey both equals true, it means AltGr is pushed. So a valid combination is either false, false or true, true.
            if (e.ctrlKey === e.altKey && !e.metaKey && e.charCode !== 0) {

                this.stopEvent(e);
                const text: string = String.fromCharCode(e.charCode);
                this._textEditor.insertText(text);
                this._textEditor.updateScrollPosition();
                this._textEditor.update();
            }
        }

        private mouseScroll() {
            const textPosition: TextPosition = this.getTextPosition();
            this._textEditor.selectTo(textPosition.line, textPosition.column);
            this._textEditor.updateScrollPosition();
            this._textEditor.update();
        }

        private mouseScroll_interval() {
            const textPosition: TextPosition = this.getTextCoordinate();
            const size: TextPosition = this._textEditor.size;
            if ((textPosition.line < 0) || (textPosition.line >= size.line) || (textPosition.column < 0) || (textPosition.column >= size.column)) {
                this.mouseScroll();
            }
        }

        private pointerDown() {
            const textPosition: TextPosition = this.getTextPosition();
            this._textEditor.select(textPosition.line, textPosition.column);
        }

        private pointerMove() {
            if (this._mouseCapture) {
                this.mouseScroll();
            }
            this.updateMouseCursor();
        }

        private pointerUp() {
            this._mouseCapture = false;
            this.stopScrollTimer();
            this.updateMouseCursor();
        }

        private startScrollTimer() {
            this.stopScrollTimer();
            this._scrollTimer = window.setInterval(this.mouseScroll_interval.bind(this), 75);
        }

        private stopScrollTimer() {
            if (this._scrollTimer !== null) {
                window.clearInterval(this._scrollTimer);
                this._scrollTimer = null;
            }
        }

        private stopEvent(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        private updateMouseCursor() {
            this._canvas.style.cursor = "text";
        }

        private updatePointerPosition(x, y) {
            const devicePixelRatio: number = this._textEditor.devicePixelRatio;
            this._pointerPosition = new Point(x * devicePixelRatio, y * devicePixelRatio);
            let node: HTMLElement = this._canvas;
            while (node !== null) {
                this._pointerPosition.x -= node.offsetLeft * devicePixelRatio;
                this._pointerPosition.y -= node.offsetTop * devicePixelRatio;
                node = node.offsetParent as HTMLElement;
            }
        }

        private getTextCoordinate() {
            const x = this._pointerPosition.x + (this._textEditor.fontSize.width / 2);
            const y = this._pointerPosition.y;
            return this._textEditor.getTextPosition(new Point(x, y));
        }

        private getTextPosition() {
            const textPosition: TextPosition = this.getTextCoordinate();
            textPosition.line += this._textEditor.scrollPosition.line;
            textPosition.column += this._textEditor.scrollPosition.column;
            return textPosition;
        }

        private processKey(keyCode: number, shiftKey: boolean, ctrlKey: boolean, altKey: boolean, metaKey: boolean) {
            if (this._isMac) {
                if (ctrlKey && !shiftKey && !altKey && !metaKey) {
                    if (keyCode === 65) {
                        ctrlKey = false;
                        keyCode = 36; // HOME
                    } else if (keyCode === 69) {
                        ctrlKey = false;
                        keyCode = 35; // END
                    }
                } else if (metaKey && keyCode === 37) {
                    metaKey = false;
                    keyCode = 36; // HOME
                } else if (metaKey && keyCode === 39) {
                    metaKey = false;
                    keyCode = 35; // END
                }
            }

            return this._textEditor.processKey(keyCode, shiftKey, ctrlKey, altKey, metaKey);
        }
    }
}
