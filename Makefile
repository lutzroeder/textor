
TYPESCRIPT = ./node_modules/.bin/tsc
UGLIFY = ./node_modules/.bin/uglifyjs

BUILD_DIR = ./dist
PUBLISH_DIR = ./dist/gh-pages

all: install clean build

build: $(BUILD_DIR)/texteditor.min.js $(BUILD_DIR)/javascript.min.js $(BUILD_DIR)/html.min.js $(BUILD_DIR)/css.min.js $(BUILD_DIR)/demo_canvaspad.html $(BUILD_DIR)/demo_css.html  $(BUILD_DIR)/demo_html.html

$(BUILD_DIR)/texteditor.js: ./src/texteditor/tsconfig.json
	@$(TYPESCRIPT) -p $^

$(BUILD_DIR)/texteditor.min.js: $(BUILD_DIR)/texteditor.js
	@$(UGLIFY) $^ --source-map -o $@

$(BUILD_DIR)/javascript.js: ./src/javascript/tsconfig.json
	@$(TYPESCRIPT) -p $^

$(BUILD_DIR)/javascript.min.js: $(BUILD_DIR)/javascript.js
	@$(UGLIFY) $^ --source-map -o $@

$(BUILD_DIR)/html.js: ./src/html/tsconfig.json
	@$(TYPESCRIPT) -p $^

$(BUILD_DIR)/html.min.js: $(BUILD_DIR)/html.js
	@$(UGLIFY) $^ --source-map -o $@

$(BUILD_DIR)/css.js: ./src/css/tsconfig.json
	@$(TYPESCRIPT) -p $^

$(BUILD_DIR)/css.min.js: $(BUILD_DIR)/css.js
	@$(UGLIFY) $^ --source-map -o $@

$(BUILD_DIR)/demo_canvaspad.html: ./samples/demo_canvaspad.html
	@cp $^ $(BUILD_DIR)

$(BUILD_DIR)/demo_css.html: ./samples/demo_css.html
	@mkdir -p $(BUILD_DIR)
	@cp $^ $(BUILD_DIR)

$(BUILD_DIR)/demo_html.html: ./samples/demo_html.html
	@mkdir -p $(BUILD_DIR)
	@cp $^ $(BUILD_DIR)

install: ./package.json
	npm install --quiet

clean:
	@rm -rf $(BUILD_DIR)

publish: install clean build
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
