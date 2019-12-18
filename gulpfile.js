var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var color = require('ansi-colors');
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
            choices: ['en', 'fr', 'it', 'ru', 'pl'],
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
        js: 'source/js/*.njk',
        images: 'source/images/**/*.*'
    },
    build: {
        css: 'build/storage/css/',
        data: 'build/storage/data/',
        fonts: 'build/storage/fonts/',
        html: 'build/',
        js: 'build/storage/js/',
        images: 'build/storage/images/'
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
var exclude_list = argv.community ? ['fr', 'it', 'ru', 'pl'] : ['ru'];

if (exclude_list.indexOf(argv.language) > -1) {
    log.warn(color.yellow('This translation is incomplete and cannot be set as default.'));
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


// Swallow errors and format error messages -----------------------------------
var on_error = function(error) {
    log.error(color.red(color.bgRed.white(error.name), error.message));
    this.emit('end');
};


// ============================================================================
// ********************************** TASKS ***********************************
// ============================================================================

// Back up dependencies to “source/vendor” ====================================

function fetch_vendor() {
    log('Fetching all vendor packages...');
    return merge(
        // jQuery:
        gulp.src('node_modules/jquery/dist/jquery.js')
            .pipe(gulp.dest('source/vendor/jquery/')),
        // jQuery Mousewheel:
        gulp.src('node_modules/jquery-mousewheel/jquery.mousewheel.js')
            .pipe(gulp.dest('source/vendor/jquery.mousewheel/')),
        // hammer.js
        gulp.src('node_modules/hammerjs/hammer.js')
            .pipe(gulp.dest('source/vendor/hammer.js/')),
        // Magnific Popup:
        gulp.src(['node_modules/magnific-popup/dist/jquery.magnific-popup.js', 'node_modules/magnific-popup/dist/magnific-popup.css'])
            .pipe(gulp.dest('source/vendor/magnific-popup/')),
        // normalize.css:
        gulp.src('node_modules/normalize.css/normalize.css')
            .pipe(gulp.dest('source/vendor/normalize.css/')),
        // FontAwesome:
        gulp.src('node_modules/@fortawesome/fontawesome-free/webfonts/*.*')
            .pipe(gulp.dest('source/vendor/font-awesome/fonts/')),
        gulp.src('node_modules/@fortawesome/fontawesome-free/scss/*.scss')
            .pipe(gulp.dest('source/vendor/font-awesome/scss/')),
        // Mapplic:
        gulp.src(['node_modules/mapplic/html/mapplic/mapplic?(-ie).css', 'node_modules/mapplic/html/mapplic/mapplic.js',])
            .pipe(gulp.dest('source/vendor/mapplic/')),
            // Mapplic 4.2 package has some unnecessary images:
        gulp.src(['node_modules/mapplic/html/mapplic/images/*.*', '!node_modules/mapplic/html/mapplic/images/{boat,logo}.png'])
            .pipe(gulp.dest('source/vendor/mapplic/images/'))
    );
};


// GO, DABUS, GO ==============================================================

// Copy fonts -----------------------------------------------------------------
function build_fonts() {
    log('Copying fonts...');
    return gulp.src(path.source.fonts)
        .pipe(gulp.dest(path.build.fonts));
};


// Copy images ----------------------------------------------------------------
function build_images() {
    function add_pipe(src, dest) {
        return gulp.src(src)
            .pipe(gulp.dest(dest));
    };

    log('Copying images...');

    return merge(
        add_pipe(path.source.images, path.build.images),
        add_pipe(['source/vendor/mapplic/images/**/*.*', '!source/vendor/mapplic/images/alpha{20,50}.png'], path.build.images + 'mapplic/')
    );
};


// Copy map data --------------------------------------------------------------
function build_data() {
    var token = 'source/data/' + argv.language + '/*.json';

    log('Processing data...');

    return merge(
        // Default language:
        gulp.src(token)
            .pipe(plugins.lineEndingCorrector())
            .pipe(gulp.dest(path.build.data + argv.language + '/')),
        // Other languages:
        gulp.src([path.source.data, '!' + token])
            .pipe(plugins.replace('storage/images/', '../storage/images/'))
            .pipe(plugins.lineEndingCorrector())
            .pipe(gulp.dest(path.build.data))
    );
};


// Process CSS ----------------------------------------------------------------
function build_css() {
    var processors = [
        require('postcss-import')(),
        require('autoprefixer')
    ];

    log('Processing CSS...');

    return gulp.src(path.source.css)
        .pipe(plugins.sass())
        .on('error', on_error)
        .pipe(plugins.postcss(processors))
        .pipe(plugins.replace('images/', '../images/mapplic/'))
        .pipe(plugins.cleanCss())
        .pipe(plugins.lineEndingCorrector())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(path.build.css));
};


// Process JS -----------------------------------------------------------------
function build_js() {
    log('Processing JS...');
    return gulp.src(path.source.js)
        .pipe(plugins.nunjucksRender(nunjucks.js))
        .on('error', on_error)
        .pipe(plugins.uglify())
        .pipe(plugins.lineEndingCorrector())
        .pipe(plugins.rename({suffix: '.min'}))
        .pipe(gulp.dest(path.build.js));
};


// Process page templates -----------------------------------------------------
function build_html() {
    var token = 'source/templates/' + argv.language + '/[^_]*.njk';

    function add_pipe(src) {
        return gulp.src(src)
            .pipe(plugins.nunjucksRender(nunjucks.html))
            .on('error', on_error)
            .pipe(plugins.lineEndingCorrector())
            .pipe(gulp.dest(path.build.html));
    };

    log('Building pages from templates...');

    return merge(add_pipe(token), add_pipe([path.source.html, '!' + token]));
};


// Put it all together --------------------------------------------------------
exports.vendor  = fetch_vendor;

exports.fonts   = build_fonts;
exports.images  = build_images; // Checks map language and edition.
exports.data    = build_data    // Checks map language and edition.
exports.css     = build_css
exports.js      = build_js      // Checks map edition.
exports.html    = build_html;   // Checks map language and edition.

exports.default = function() {
    // Announce the build type: Regular or Community Edition
    var notice = argv.community ? ': Community Edition ' : ' ';
    log(color.green.bold('Building the map of Sigil' + notice + '[default language: ' + argv.language + ']'));

    return merge(
        build_fonts(),
        build_images(),
        build_data(),
        build_css(),
        build_js(),
        build_html()
    );
};
