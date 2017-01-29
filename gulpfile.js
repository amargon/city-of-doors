var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var del = require('del');
var merge = require('merge-stream');


var path = {
    nunjucks: {
        root: '.',
        html: 'source/templates/'
    },
    build: {
        css: 'build/storage/css/',
        data: 'build/storage/data/',
        fonts: 'build/storage/fonts/',
        html: 'build/',
        js: 'build/storage/js/',
        images: 'build/storage/images/'
    },
    source: {
        vendor: 'source/vendor/',
        css: 'source/scss/style.scss',
        data: 'source/data/**/*.json',
        fonts: 'source/vendor/font-awesome/fonts/fontawesome-webfont.*',
        html: 'source/templates/**/[^_]*.njk',
        js: 'source/js/*.js',
        images: 'source/images/**/*.*'
    },
    clean: {
        all: 'build/**/*.*'
    }
};

// ============================================================================
// ********************************** TASKS ***********************************
// ============================================================================

// Clean the build ------------------------------------------------------------
gulp.task('clean:all', function() {
    return del.sync(path.clean.all);
});

// Backup dependencies to 'source/vendor' -------------------------------------
gulp.task('fetch:vendor', function() {
    var jquery = gulp.src('node_modules/jquery/dist/jquery.js')
        .pipe(plugins.changed('source/vendor/jquery/'))
        .pipe(gulp.dest('source/vendor/jquery/'));

    var jquery_mousewheel = gulp.src('node_modules/jquery-mousewheel/jquery.mousewheel.js')
        .pipe(plugins.changed('source/vendor/jquery.mousewheel/'))
        .pipe(gulp.dest('source/vendor/jquery.mousewheel/'));

    var hammerjs = gulp.src('node_modules/hammerjs/hammer.js')
        .pipe(plugins.changed('source/vendor/hammer.js/'))
        .pipe(gulp.dest('source/vendor/hammer.js/'));

    var magnific_popup = gulp.src([
        'node_modules/magnific-popup/dist/jquery.magnific-popup.js',
        'node_modules/magnific-popup/dist/magnific-popup.css'
    ])
        .pipe(plugins.changed('source/vendor/magnific-popup/'))
        .pipe(gulp.dest('source/vendor/magnific-popup/'));

    var normalize = gulp.src('node_modules/normalize.css/normalize.css')
        .pipe(plugins.changed('source/vendor/normalize.css/'))
        .pipe(gulp.dest('source/vendor/normalize.css/'));

    var fa_fonts = gulp.src('node_modules/font-awesome/fonts/fontawesome-webfont.*')
        .pipe(plugins.changed('source/vendor/font-awesome/fonts/'))
        .pipe(gulp.dest('source/vendor/font-awesome/fonts/'));

    var fa_css = gulp.src('node_modules/font-awesome/css/font-awesome.css*')
        .pipe(plugins.changed('source/vendor/font-awesome/'))
        .pipe(gulp.dest('source/vendor/font-awesome/'));

    return merge(jquery, jquery_mousewheel, hammerjs, magnific_popup, normalize, fa_fonts, fa_css);
});

// GO, DABUS, GO ==============================================================

// Copy fonts -----------------------------------------------------------------
gulp.task('build:fonts', function() {
    return gulp.src(path.source.fonts)
        .pipe(plugins.changed(path.build.fonts))
        .pipe(gulp.dest(path.build.fonts))
});

// Copy images ----------------------------------------------------------------
gulp.task('build:images', function() {
    var images = gulp.src(path.source.images)
        .pipe(plugins.changed(path.build.images))
        .pipe(gulp.dest(path.build.images));

    var images_mapplic = gulp.src('source/vendor/mapplic/images/**/*.*')
        .pipe(plugins.changed('build/storage/images/mapplic/'))
        .pipe(gulp.dest('build/storage/images/mapplic/'));

    return merge(images, images_mapplic);
});

gulp.task('build:images:ce', function() {
    var images = gulp.src('source/images/en/*.*')
        .pipe(plugins.changed(path.build.images))
        .pipe(gulp.dest('build/storage/images/en/'));

    var images_mapplic = gulp.src('source/vendor/mapplic/images/**/*.*')
        .pipe(plugins.changed('build/storage/images/mapplic/'))
        .pipe(gulp.dest('build/storage/images/mapplic/'));

    return merge(images, images_mapplic);
});

// Copy map data --------------------------------------------------------------
gulp.task('build:data', function() {
    return gulp.src(path.source.data)
        .pipe(plugins.changed(path.build.data))
        .pipe(plugins.lineEndingCorrector())
        .pipe(gulp.dest(path.build.data))
});

gulp.task('build:data:ce', function() {
    return gulp.src('source/data/en/map.json')
        .pipe(plugins.changed(path.build.data))
        .pipe(plugins.lineEndingCorrector())
        .pipe(gulp.dest('build/storage/data/en/'))
});

// Process CSS ----------------------------------------------------------------
gulp.task('build:css', function () {
    var processors = [
        require('postcss-import')(),
        require('autoprefixer')({browsers: ['last 2 versions']})
    ];

    return gulp.src(path.source.css)
        .pipe(plugins.sass())
        .pipe(plugins.postcss(processors))
        .pipe(plugins.replace('images/', '../images/mapplic/'))
        .pipe(plugins.cleanCss())
        .pipe(plugins.lineEndingCorrector())
        .pipe(gulp.dest(path.build.css))
});

// Process JS -----------------------------------------------------------------
gulp.task('build:js', function() {
  return gulp.src(path.source.js)
    .pipe(plugins.nunjucksRender({
        path: path.nunjucks.root,
        ext: '.js',
        data: {path: {jquery: true}} // Make nunjucks exclude jQuery.
    }))
    .pipe(plugins.uglify())
    .pipe(plugins.lineEndingCorrector())
    .pipe(gulp.dest(path.build.js));
});

gulp.task('build:js:ce', function() {
  return gulp.src(path.source.js)
    .pipe(plugins.nunjucksRender({
        path: path.nunjucks.js,
        ext: '.js'
    }))
    .pipe(plugins.uglify())
    .pipe(plugins.lineEndingCorrector())
    .pipe(gulp.dest(path.build.js));
});

// Process HTML templates -----------------------------------------------------
gulp.task('build:html', function() {
    return gulp.src(path.source.html)
        .pipe(plugins.nunjucksRender({path: path.nunjucks.html}))
        .pipe(plugins.lineEndingCorrector())
        .pipe(gulp.dest(path.build.html))
});

gulp.task('build:html:ce', function() {
    return gulp.src(path.nunjucks.html + '_CE/_index.njk')
        .pipe(plugins.nunjucksRender({path: path.nunjucks.html}))
        .pipe(plugins.rename({basename: 'index'}))
        .pipe(plugins.lineEndingCorrector())
        .pipe(gulp.dest(path.build.html))
});

// Put it all together --------------------------------------------------------
gulp.task('build', [
    'build:fonts',
    'build:images',
    'build:data',
    'build:css',
    'build:js',
    'build:html'
]);

// Build The Map of Sigil: Community Edition.
gulp.task('build:ce', [
    'build:fonts',
    'build:images:ce',
    'build:data:ce',
    'build:css',
    'build:js:ce',
    'build:html:ce'
]);

gulp.task('default', ['build']);
