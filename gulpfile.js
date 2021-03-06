var path = require('path');

var gulp = require('gulp');
var clean = require('gulp-clean');
var replace = require('gulp-replace');
var hash = require('gulp-hash');
var swPrecache = require('sw-precache');
var mergeStream = require('merge-stream');
var htmlmin = require('gulp-htmlmin');

var myPath = {
  app: path.resolve(__dirname, 'app'),
  public: path.resolve(__dirname, 'public'),
  dist: path.resolve(__dirname, 'dist'),
  nodeModules: path.resolve(__dirname, 'node_modules')
};

gulp.task('clean', function () {
  return gulp.src(myPath.dist).pipe(clean());
});

gulp.task('hash-bundle', function () {
  return gulp.src(path.join(myPath.dist, 'bundle.js'))
  .pipe(hash()) // Add hashes to the files' names
  .pipe(gulp.dest(myPath.dist)) // Write the renamed files
  .pipe(hash.manifest('assets.json', {
    deleteOld: true,
    sourceDir: myPath.dist
  })) // Switch to the manifest file
  .pipe(gulp.dest(myPath.dist)); // Write the manifest file
});

gulp.task('copy-public', ['hash-bundle'], function () {
  var index = gulp.src(path.join(myPath.public, 'index.html'))
      .pipe(htmlmin({
        collapseBooleanAttributes:      true,
        collapseWhitespace:             true,
        removeAttributeQuotes:          true,
        removeComments:                 true, // Only if you don't use comment directives!
        removeEmptyAttributes:          true,
        // removeRedundantAttributes:      true,
        removeScriptTypeAttributes:     true,
        removeStyleLinkTypeAttributes:  true,
        keepClosingSlash:               true,
        customAttrCollapse:             /ng-class|ng-show|ng-if|show-status|spin/
      }))
      .pipe(gulp.dest(myPath.dist));

  var others = gulp.src([
        path.join(myPath.public, 'images', '**'),
        path.join(myPath.public, 'manifest.json'),
      ], { base: myPath.public })
      .pipe(gulp.dest(myPath.dist));

  return mergeStream(index, others);
});

gulp.task('copy-sw', function () {
  var vendor = gulp.src(path.join(myPath.nodeModules, 'sw-toolbox', 'sw-toolbox.js'))
      .pipe(gulp.dest(myPath.dist));

  var script = gulp.src(path.join(myPath.app, 'sw-toolbox-script.js'))
      .pipe(hash()) // Add hashes to the files' names
      .pipe(gulp.dest(myPath.dist)) // Write the renamed files
      .pipe(hash.manifest('assets-sw-toolbox.json', {
        deleteOld: true,
        sourceDir: myPath.dist
      })) // Switch to the manifest file
      .pipe(gulp.dest(myPath.dist)); // Write the manifest file

  return mergeStream(vendor, script);
});

gulp.task('update-index', ['copy'], function () {
  var assets = require(path.join(myPath.dist, 'assets.json'));
  return gulp.src(path.join(myPath.dist, 'index.html'))
  .pipe(replace('bundle.js', assets['bundle.js']))
  .pipe(gulp.dest(myPath.dist));
});

gulp.task('generate-service-worker', ['update-index'], function (callback) {
  var swtAssets = require(path.join(myPath.dist, 'assets-sw-toolbox.json'));

  var staticFileGlobs = [
    'images/*.{svg,png,jpg,gif}',
    'index.html',
    'bundle-*.js'
  ].map(function (v) { return path.join('dist', v); });

  var importScripts = [
    'sw-toolbox.js',
    swtAssets['sw-toolbox-script.js']
  ];

  swPrecache.write(path.join(myPath.dist, 'sw.js'), {
    staticFileGlobs: staticFileGlobs,
    importScripts: importScripts,
    stripPrefix: 'dist/'
  }, callback);
});

gulp.task('copy', ['copy-public', 'copy-sw']);

gulp.task('dist', ['hash-bundle', 'copy', 'update-index', 'generate-service-worker']);
