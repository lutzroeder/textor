var gulp = require("gulp");
var sourcemaps = require("gulp-sourcemaps");
var typescript = require("gulp-typescript");
var uglify = require("gulp-uglify");
var open = require("gulp-open");

gulp.task("build", [ "build:page", "build:texteditor", "build:javascript", "build:html", "build:css" ], function() {
});

gulp.task("build:texteditor", function() {
    return gulp.src([ "./src/texteditor/*.ts", "./lib/*.ts" ])
        .pipe(sourcemaps.init())
        .pipe(typescript({ target: "ES5", out: "texteditor.js" }))
        .once("error", function() { this.once("finish", () => process.exit(1)) })
        .pipe(uglify())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("./build"));
});

gulp.task("build:javascript", function() {
    return gulp.src("./src/javascript/*.ts")
        .pipe(sourcemaps.init())
        .pipe(typescript({ target: "ES5", out: "javascript.js" }))
        .once("error", function() { this.once("finish", () => process.exit(1)) })
        .pipe(uglify())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("./build"));
});

gulp.task("build:css", function() {
    return gulp.src("./src/css/*.ts")
        .pipe(sourcemaps.init())
        .pipe(typescript({ target: "ES5", out: "css.js" }))
        .once("error", function() { this.once("finish", () => process.exit(1)) })
        .pipe(uglify())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("./build"));
});

gulp.task("build:html", function() {
    return gulp.src("./src/html/*.ts")
        .pipe(sourcemaps.init())
        .pipe(typescript({ target: "ES5", out: "html.js" }))
        .once("error", function() { this.once("finish", () => process.exit(1)) })
        .pipe(uglify())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest("./build"));
});

gulp.task("build:page", function () {
    return gulp.src([ "./samples/*.html" ])
        .pipe(gulp.dest("./build"));
});

gulp.task("default", [ "build" ], function() {
    return gulp.src("./build/demo_canvaspad.html")
        .pipe(open());
});