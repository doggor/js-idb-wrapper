class IDBError extends Error
	constructor: (@message)->
		console.error "IDBError: #{@message}"