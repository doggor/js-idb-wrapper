#AMD
if typeof define is "function" and define.amd?
	define('IDB', DatabaseManager)

#CommonJS
else if module?.exports?
	module.exports = DatabaseManager

#DOM or WebWorker
else
	if not @.hasOwnProperty 'IDB'
		@.IDB = DatabaseManager
	else if not @.hasOwnProperty '$IDB'
		@.$IDB = DatabaseManager
	else
		msg = "Fail to export IDB: name 'IDB' and '$IDB' is in use."
		if typeof console?.error is "function"
			console.error msg
		else
			throw msg
