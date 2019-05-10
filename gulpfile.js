var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var c = require('ansi-colors');
var del = require('del');
var log = require('fancy-log');
var merge = require('merge-stream');


// ============================================================================
// ****************************** CONFIGURATION *******************************
// ============================================================================

var argv = require('yargs')
    .options({
        'community': {
            alias: 'ce',
            describe: 'trigger the Community Edition build',
            type: 'boolean'
        },
        'development': {
            alias: 'dev',
            describe: 'enable Mapplic developer mode (display coordinates of the cursor)',
            type: 'boolean'
        },
        'language': {
            alias: 'lang',
            // Two-letter codes of target languages on Crowdin:
            choices: ['en', 'fr', 'it', 'ru'],
            default: 'en',
            describe: 'set the default language',
            nargs: 1,
            type: 'string'
        }
    })
    .argv;


var path = {
    source: {
        css: 'source/scss/style.scss',
        data: 'source/data/**/*.json',
        // Exclude Font Awesome Brands:
        fonts: ['source/vendor/font-awesome/fonts/*.*', '!source/vendor/font-awesome/fonts/fa-brands-*.*'],
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
        path: 'source/vendor/',
        ext: '.js',
        // Exclude jQuery from the Regular build:
        data: {common: {jquery: argv.community ? false : true}}
    },
    html: {
        path: 'source/templates/',
        data: {
            // Configure the layout:
            community: argv.community,
            default_language: argv.language,
            developer_mode: argv.development ? true : false,
            translations_excluded: [],
            analytics_id: argv.community ? false : '31374838',
            base_url: 'https://nether-whisper.ru/rp/planescape/map-of-sigil/',
            robots: argv.community ? 'noindex, nofollow' : 'index, nofollow, noarchive',
            ogp: argv.community ? false : true,
            common: {
                jquery: argv.community ? false : '/storage/js/jquery.min.js',
                favicons: argv.community ? false : {
                    dir: '/storage/images/favicons/',
                    size: ['96x96', '32x32', '16x16']
                }
            }
        }
    }
};


// ============================================================================
// ********************************* UTILITIES ********************************
// ============================================================================

// Exclude incomplete and unreleased translations -----------------------------
var exclude_list = argv.community ? ['fr', 'it', 'ru'] : ['it', 'ru'];

if (exclude_list.indexOf(argv.language) > -1) {
    log.warn(c.yellow('This translation is incomplete and cannot be set as default.'));
    process.exit(1);
} else {
    function exclude_translations(source) {
        return source.replace('**', '!(' + exclude_list.join('|') + ')');
    };

    path.source.images = exclude_translations(path.source.images);
    path.source.data = exclude_translations(path.source.data);
    path.source.html = exclude_translations(path.source.html);

    nunjucks.html.data.translations_excluded = exclude_list;
};


// Format error messages and force exit code 1 on error -----------------------
var on_error = function(error) {
    log.error(c.red(c.bgRed.white(error.name), error.message));
    process.exit(1);
};


// ============================================================================
// ********************************** TASKS ***********************************
// ============================================================================

// Clean the build ------------------------------------------------------------
gulp.task('clean:all', function() {
    log('Deleting previous build...');
    return del(path.clean.all);
});


// Back up dependencies to “source/vendor” ====================================

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
    log('Fetching all vendor packages...');

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

    var fa_fonts = gulp.src('node_modules/@fortawesome/fontawesome-free/webfonts/*.*')
        .pipe(plugins.changed('source/vendor/font-awesome/fonts/'))
        .pipe(gulp.dest('source/vendor/font-awesome/fonts/'));

    var fa_css = gulp.src('node_modules/@fortawesome/fontawesome-free/scss/*.scss')
        .pipe(plugins.changed('source/vendor/font-awesome/scss/'))
        .pipe(gulp.dest('source/vendor/font-awesome/scss/'));

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
    log('Fetching Mapplic package...');
    return merge(fetch_mapplic_images, fetch_mapplic);
});


// GO, DABUS, GO ==============================================================

// Announce the build type: Regular or Community Edition ----------------------
gulp.task('announce', function(done) {
    if (argv.community) {
        log(c.green.bold('Building the map of Sigil',  '(Community Edition, default language: ' + argv.language + ')'));
    } else {
        log(c.green.bold('Building the map of Sigil',  '(default language: ' + argv.language + ')'));
    };
    done();
});


// Copy fonts -----------------------------------------------------------------
gulp.task('build:fonts', function() {
    return gulp.src(path.source.fonts)
        .pipe(plugins.changed(path.build.fonts))
        .pipe(gulp.dest(path.build.fonts));
});


// Copy images ----------------------------------------------------------------
gulp.task('build:images', function() {
    function add_pipe(src, dest) {
        return gulp.src(src)
            .pipe(plugins.changed(dest))
            .pipe(gulp.dest(dest));
    };

    var copy_images = add_pipe(path.source.images, path.build.images);
    var copy_mapplic_images = add_pipe(['source/vendor/mapplic/images/**/*.*', '!source/vendor/mapplic/images/alpha{20,50}.png'], path.build.images + 'mapplic/');

    return merge(copy_images, copy_mapplic_images);
});


// Copy map data --------------------------------------------------------------
gulp.task('build:data', function() {
    var token = 'source/data/' + argv.language + '/*.json';

    var build_default = gulp.src(token)
        .pipe(plugins.changed(path.build.data))
        .pipe(plugins.lineEndingCorrector())
        .pipe(gulp.dest(path.build.data + argv.language + '/'));

    var build_other = gulp.src([path.source.data, '!' + token])
        .pipe(plugins.changed(path.build.data))
        .pipe(plugins.replace('storage/images/', '../storage/images/'))
        .pipe(plugins.lineEndingCorrector())
        .pipe(gulp.dest(path.build.data));

    return merge(build_default, build_other);
});


// Process CSS ----------------------------------------------------------------
gulp.task('build:css', function () {
    var processors = [
        require('postcss-import')(),
        require('autoprefixer')({browsers: ['last 2 versions']})
    ];

    return gulp.src(path.source.css)
        .pipe(plugins.sass())
        .on('error', on_error)
        .pipe(plugins.postcss(processors))
        .pipe(plugins.replace('images/', '../images/mapplic/'))
        .pipe(plugins.cleanCss())
        .pipe(plugins.lineEndingCorrector())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(path.build.css));
});


// Process JS -----------------------------------------------------------------
gulp.task('build:js', function() {
    return gulp.src(path.source.js)
        .pipe(plugins.nunjucksRender(nunjucks.js))
        .on('error', on_error)
        .pipe(plugins.uglify())
        .pipe(plugins.lineEndingCorrector())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(path.build.js));
});


// Process page templates -----------------------------------------------------
gulp.task('build:html', function() {
    var token = 'source/templates/' + argv.language + '/[^_]*.njk';

    function add_pipe(src) {
        return gulp.src(src)
            .pipe(plugins.nunjucksRender(nunjucks.html))
            .on('error', on_error)
            .pipe(plugins.lineEndingCorrector())
            .pipe(gulp.dest(path.build.html));
    };

    var build_default = add_pipe(token);
    var build_other = add_pipe([path.source.html, '!' + token]);

    return merge(build_default, build_other);
});


// Put it all together --------------------------------------------------------
gulp.task('build', gulp.parallel(
    'build:fonts',
    'build:images',
    'build:data',
    'build:css',
    'build:js',
    'build:html'
));

gulp.task('default', gulp.series('announce', 'build'));
