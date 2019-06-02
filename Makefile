
TYPESCRIPT = ./node_modules/.bin/tsc
UGLIFY = ./node_modules/.bin/uglifyjs

BUILD_DIR = ./dist
PUBLISH_DIR = ./dist/gh-pages

all: install clean build lint

clean:
	@rm -rf $(BUILD_DIR)

install: ./package.json
	npm install --quiet

build:
	npx tsc --project ./src/texteditor/tsconfig.json
	npx tsc --project ./src/javascript/tsconfig.json
	npx tsc --project ./src/html/tsconfig.json
	npx tsc --project ./src/css/tsconfig.json
	npx uglifyjs $(BUILD_DIR)/texteditor.js --source-map -o $(BUILD_DIR)/texteditor.min.js
	npx uglifyjs $(BUILD_DIR)/javascript.js --source-map -o $(BUILD_DIR)/javascript.min.js
	npx uglifyjs $(BUILD_DIR)/html.js --source-map -o $(BUILD_DIR)/html.min.js
	npx uglifyjs $(BUILD_DIR)/css.js --source-map -o $(BUILD_DIR)/css.min.js
	@cp ./samples/demo_canvaspad.html $(BUILD_DIR)
	@cp ./samples/demo_css.html $(BUILD_DIR)
	@cp ./samples/demo_html.html $(BUILD_DIR)

lint:
	npx tslint -c ./tslint.json --project ./src/texteditor/tsconfig.json
	npx tslint -c ./tslint.json --project ./src/javascript/tsconfig.json
	npx tslint -c ./tslint.json --project ./src/html/tsconfig.json
	npx tslint -c ./tslint.json --project ./src/css/tsconfig.json

publish: install clean build lint
	rm -rf $(PUBLISH_DIR)
	git clone git@github.com:lutzroeder/textor.git $(PUBLISH_DIR) --branch gh-pages
	rm -rf $(PUBLISH_DIR)/*
	cp ./dist/css.js $(PUBLISH_DIR)/
	cp ./dist/html.js $(PUBLISH_DIR)/
	cp ./dist/javascript.js $(PUBLISH_DIR)/
	cp ./dist/texteditor.js $(PUBLISH_DIR)/
	cp ./dist/demo_canvaspad.html $(PUBLISH_DIR)/index.html
	cp ./dist/demo_html.html $(PUBLISH_DIR)/
	cp ./dist/demo_css.html $(PUBLISH_DIR)/
	git -C $(PUBLISH_DIR) add --all
	git -C $(PUBLISH_DIR) commit --amend --no-edit
	git -C $(PUBLISH_DIR) push --force origin gh-pages
	rm -rf $(PUBLISH_DIR)
