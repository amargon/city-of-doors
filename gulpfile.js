var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var del = require('del');
var merge = require('merge-stream');


// ============================================================================
// ****************************** CONFIGURATION *******************************
// ============================================================================

var path = {
    common: {
        templates: 'source/templates/',
        vendor: 'source/vendor/'
    },
    source: {
        css: 'source/scss/style.scss',
        data: 'source/data/**/*.json',
        fonts: 'source/vendor/font-awesome/fonts/fontawesome-webfont.*',
        html: 'source/templates/**/[^_]*.njk',
        js: 'source/js/*.js',
        images: 'source/images/**/*.*'
    },
    build: {
        css: 'build/storage/css/',
        data: 'build/storage/data/',
        fonts: 'build/storage/fonts/',
        html: 'build/',
        js: 'build/storage/js/',
        images: 'build/storage/images/'
    },
    clean: {
        all: 'build/'
    }
};


var nunjucks = {
    js: {
        path: path.common.vendor,
        ext: '.js',
        data: {path: {jquery: true}} // Make nunjucks exclude jQuery.
    },
    html: {
        path: path.common.templates,
        data: {
            community: false,
            default_language: 'en',
            base_url: 'http://nether-whisper.ru/rp/planescape/map-of-sigil/',
            robots: 'index, nofollow, noarchive',
            analytics_id: '31374838',
            ogp: true,
            swiftype: true,
            path: {
                jquery: '/storage/js/jquery.js',
                favicons: {
                    dir: '/storage/images/favicons/',
                    size: ['96x96', '32x32', '16x16']
                }
            }
        }
    }
};


// Check build type: Regular or Community Edition (i.e. gulp --ce) ============

if (plugins.util.env.ce === true) {
    delete nunjucks.js.data;

    // Exclude uncomplete translations ----------------------------------------
    var translations = ['fr', 'it', 'ru'];

    // Images:
    path.source.images = 'source/images/en/*.*';
    path.build.images = 'build/storage/images/en/';

    // Data:
    path.source.data = 'source/data/en/map.json';
    path.build.data = 'build/storage/data/en/';

    // Templates:
    path.source.html = [path.source.html];
    for (var i = 0; i < translations.length; i++) {
        path.source.html.push('!' + path.common.templates + translations[i] + '/[^_]*.njk');
    }

    // Switch global template variables ---------------------------------------
    nunjucks.html.data.community = true;
    nunjucks.html.data.analytics_id = false;
    nunjucks.html.data.ogp = false;
    nunjucks.html.data.swiftype = false;
    nunjucks.html.data.robots = 'noindex, nofollow';
    nunjucks.html.data.path.jquery = false;
};


// ============================================================================
// ********************************** TASKS ***********************************
// ============================================================================

// Clean the build ------------------------------------------------------------
gulp.task('clean:all', function() {
    return del.sync(path.clean.all);
});


// Backup dependencies to “source/vendor” =====================================

// Shared pipes to fetch the Mapplic package if it’s installed ----------------
var fetch_mapplic_images = gulp.src('node_modules/mapplic/html/mapplic/images/*.*')
    .pipe(plugins.changed('source/vendor/mapplic/images/'))
    .pipe(gulp.dest('source/vendor/mapplic/images/'));

var fetch_mapplic = gulp.src([
    'node_modules/mapplic/html/mapplic/mapplic?(-ie).css',
    'node_modules/mapplic/html/mapplic/mapplic.js',
])
    .pipe(plugins.changed('source/vendor/mapplic/'))
    .pipe(gulp.dest('source/vendor/mapplic/'));


// Fetch all packages ---------------------------------------------------------
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

    var fa_css = gulp.src('node_modules/font-awesome/css/font-awesome.css')
        .pipe(plugins.changed('source/vendor/font-awesome/'))
        .pipe(gulp.dest('source/vendor/font-awesome/'));

    return merge(
        jquery,
        jquery_mousewheel,
        hammerjs,
        magnific_popup,
        normalize,
        fa_fonts, fa_css,
        fetch_mapplic_images, fetch_mapplic
    );
});

// Fetch only the Mapplic package ---------------------------------------------
gulp.task('fetch:mapplic', function() {
    return merge(fetch_mapplic_images, fetch_mapplic);
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

    var images_mapplic = gulp.src(['source/vendor/mapplic/images/**/*.*', '!source/vendor/mapplic/images/alpha{20,50}.png'])
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
    .pipe(plugins.nunjucksRender(nunjucks.js))
    .pipe(plugins.uglify())
    .pipe(plugins.lineEndingCorrector())
    .pipe(gulp.dest(path.build.js));
});


// Process page templates -----------------------------------------------------
gulp.task('build:html', function() {
    return gulp.src(path.source.html)
        .pipe(plugins.nunjucksRender(nunjucks.html))
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

gulp.task('default', ['build']);
