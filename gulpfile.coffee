gulp = require 'gulp'
sourcemaps = require 'gulp-sourcemaps'
coffee = require 'gulp-coffee'
concat = require 'gulp-concat'
minify = require 'gulp-minify'


sourceFiles = [
	"src/util/env.coffee"
	"src/util/indexedDB.coffee"
	"src/util/IDBTransaction.coffee"
	"src/util/IDBKeyRange.coffee"
	"src/util/IDBRequest2Q.coffee"
	"src/util/IDBTx2Q.coffee"
	"src/IDBError.coffee"
	"src/Schema.coffee"
	"src/Query.coffee"
	"src/Store.coffee"
	"src/Database.coffee"
	"src/DatabaseManager.coffee"
	"src/export.coffee"
]


gulp.task 'js', ()->
	gulp.src sourceFiles
		.pipe sourcemaps.init()
		.pipe concat "idb.js"
		.pipe coffee()
		.pipe sourcemaps.write("./")
		.pipe gulp.dest "release"


gulp.task 'min-js', ['js'], ()->
	gulp.src "release/idb.js"
		.pipe minify(
			ext:
				min: ".min.js"
		)
		.pipe gulp.dest "release"

