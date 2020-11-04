const PUBLISH_DIRECTORY = 'docs';
const PREPEND_IMG_SRC_URL = 'https://saabbir.com/email-magic-html/';

const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const nunjucksRender = require('gulp-nunjucks-render');
const imagemin = require('gulp-imagemin');
const cache = require('gulp-cache');
const del = require('del');
const gulpInlineCSS = require('gulp-inline-css');
const browserSync = require('browser-sync').create();
const gulpReplaceImageSrc = require('gulp-replace-image-src');

function transpileInlineSCSS() {
  return gulp
    .src('./src/scss/inline.scss')
    .pipe(sass({
      outputStyle: 'expanded'
    }).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(gulp.dest(`${PUBLISH_DIRECTORY}/css`));
}

function transpileEmbeddedSCSS() {
  return gulp
    .src('./src/scss/embedded.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(gulp.dest(`${PUBLISH_DIRECTORY}/css`));
}

function inlineCSS() {
  return gulp
    .src(`${PUBLISH_DIRECTORY}/*.html`)
    .pipe(gulpInlineCSS({
      applyStyleTags: false,
      removeStyleTags: false
    }))
    .pipe(gulp.dest(`${PUBLISH_DIRECTORY}`))
}

function transpileNunjucks() {
  return gulp
    .src('./src/emails/*.njk')
    .pipe(nunjucksRender({
      path: ['./src/templates', `${PUBLISH_DIRECTORY}/css`]
    }))
    .pipe(gulp.dest(`${PUBLISH_DIRECTORY}`));
}

function optimizeImages() {
  return gulp
    .src('./src/images/**')
    .pipe(cache(imagemin([
      imagemin.gifsicle({
        interlaced: true
      }),
      imagemin.mozjpeg({
        quality: 75,
        progressive: true
      }),
      imagemin.optipng({
        optimizationLevel: 5
      }),
      imagemin.svgo({
        plugins: [{
            removeViewBox: true
          },
          {
            cleanupIDs: false
          }
        ]
      })
    ])))
    .pipe(gulp.dest(`${PUBLISH_DIRECTORY}/images`));
}

function cleanBuild() {
  return del([PUBLISH_DIRECTORY, 'dist']);
}

function startBrowserSync(done) {
  browserSync.init({
    server: {
      baseDir: PUBLISH_DIRECTORY
    }
  });

  done();
}

function reloadBrower(done) {
  browserSync.reload();

  done();
}

function watchFileChanges(done) {
  gulp.watch('./src/**/*.scss', gulp.series(
    gulp.parallel(transpileEmbeddedSCSS, transpileInlineSCSS),
    transpileNunjucks,
    inlineCSS,
    reloadBrower
  ));
  gulp.watch('./src/**/*.njk', gulp.series(
    transpileNunjucks,
    inlineCSS,
    reloadBrower
  ));
  gulp.watch('./src/images/**', gulp.series(
    optimizeImages,
    reloadBrower
  ));

  done();
}

function prependImgSrc() {
  return gulp
    .src(`${PUBLISH_DIRECTORY}/*.html`)
    .pipe(gulpReplaceImageSrc({
      prependSrc : PREPEND_IMG_SRC_URL,
      keepOrigin : true
    }))
    .pipe(gulp.dest('dist'));
}

exports.build = buildTask = gulp.series(
  cleanBuild,
  gulp.parallel(
    transpileInlineSCSS,
    transpileEmbeddedSCSS,
    optimizeImages
  ),
  transpileNunjucks,
  inlineCSS,
  prependImgSrc
);

exports.dev = gulp.series(
  buildTask,
  gulp.parallel(
    startBrowserSync,
    watchFileChanges
  )
);