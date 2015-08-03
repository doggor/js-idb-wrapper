#AMD
if typeof define is "function" and define.amd?
	define('IDB', DatabaseManager)

#CommonJS
else if module?.exports?
	module.exports = DatabaseManager

#DOM or WebWorker
else
	if env.hasOwnProperty 'IDB'
		otherLib = env['IDB']
		env.IDB = DatabaseManager
		env.IDB.noConflict = -> otherLib
	else
		env.IDB = DatabaseManager
