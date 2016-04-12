'use strict';

var fs = require('fs')
var gulp = require('gulp')
var watch = require('gulp-watch')
var rigger = require('gulp-rigger')
var sequence = require('gulp-sequence')
var rimraf = require('rimraf')
var mkdirp = require("mkdirp")

var cfg = {
    
    dev: {
        
        target: './build',
        
        assets: [
            './src/**/*.*',
            '!./src/js/**/*.*'
        ],
        
        js_static: [
            './src/js/lib/loader.js',
            './src/js/lib/swfobject.js',
            './src/js/const.js',
            './src/js/flash_main.js'],
        
        js_build: ['./src/js/common.js']
    }
    
}

var data = cfg.dev

gulp.task('clean', function(cb) {
    rimraf(data.target, cb);
})

gulp.task('make-dir', function(cb) {
    mkdirp.sync(data.target)
    cb()
})

gulp.task('copy:assets', function() {
    return gulp.src(data.assets)
                .pipe(gulp.dest(data.target))   
})

gulp.task('copy:js', function() {
    return gulp.src(data.js_static)
                .pipe(gulp.dest(data.target + '/js'))   
})

gulp.task('build:js', function () {
    return gulp.src(data.js_build)
                .pipe(rigger())
                .pipe(gulp.dest(data.target + '/js'))
})

gulp.task('watch', function() {
    gulp.watch('./src/js/**/*.*', ['build:js'])
    gulp.watch(data.assets, ['copy:assets'])
})

gulp.task('copy', sequence('copy:assets', 'copy:js'))
gulp.task('default', sequence('clean', 'make-dir', 'build:js', 'copy', 'watch'))