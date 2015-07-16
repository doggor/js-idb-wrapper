class Store
	
	_name =   #name of the store
	
	_db =   #the Database object belong to
	
	
	#param (string) storeName
	#param (Database) db, the Database object belong to
	constructor: (storeName, db)->
		_name = storeName
		_db = db
	
	
	#getter of IDBObjectStore object  which this object refer to
	getIDBObjectStore = (mode = "readwrite")->
		_db.getIDBTransaction(_name, mode).then (tx)->
			tx.objectStore(_name)
	
	
	#return the key path of the store
	key: -> @getIDBObjectStore("readonly").keyPath
	
	
	#return the name of the store
	name: ->  _name
	
	
	#return the list of indexes found in the store
	indexes: ->  @getIDBObjectStore("readonly").indexNames
	
	
	#return boolean indecating if the store key is auto increased
	isAutoIncrement: -> @getIDBObjectStore("readonly").autoIncrement
	
	
	#action to add a new object to store
	add: (arg...)->
		@getIDBObjectStore().then (idbStore)->
			IDBRequest2Q( idbStore.add(arg...) )
	
	
	#action to update existed object from the store
	update: (arg...)->
		@getIDBObjectStore().then (idbStore)->
			IDBRequest2Q( idbStore.put(arg...) )
	
	
	#action to delete a object from the store
	delete: (key)->
		@getIDBObjectStore().then (idbStore)->
			IDBRequest2Q( idbStore.delete(key) )
	
	
	#action to delete all objects found in the store
	clear: ->
		@getIDBObjectStore().then (idbStore)->
			IDBRequest2Q( idbStore.clear() )
	
	
	#return a new Query object that applying with given expression
	where: (expression)->
		exp = expression
			.trim()
			.replace /(\s|\t)+/g  , ""
		
		switch
			when exp.match /^.+=.+$/
				[indexName, range] = exp.split("=")
				range = IDBKeyRange.only(string2Range range)
			when exp.match /^.+<.+$/
				[indexName, range] = exp.split("<")
				range = IDBKeyRange.upperBound(string2Range range, true)
			when exp.match /^.+<=.+$/
				[indexName, range] = exp.split("<=")
				range = IDBKeyRange.upperBound(string2Range range)
			when exp.match /^.+>.+$/
				[indexName, range] = exp.split(">")
				range = IDBKeyRange.lowerBound(string2Range range, true)
			when exp.match /^.+>=.+$/
				[indexName, range] = exp.split(">=")
				range = IDBKeyRange.lowerBound(string2Range range)
			when exp.match /^.+<.+<.+$/
				[lower, indexName, upper] = exp.split("<")
				range = IDBKeyRange.bound(string2Range lower, string2Range upper, true, true)
			when exp.match /^.+<=.+<.+$/
				[lower, indexName, upper] = exp.split(/<\=?/)
				range = IDBKeyRange.bound(string2Range lower, string2Range upper, false, true)
			when exp.match /^.+<.+<=.+$/
				[lower, indexName, upper] = exp.split("<\=?")
				range = IDBKeyRange.bound(string2Range lower, string2Range upper, true)
			when exp.match /^.+<=.+<=.+$/
				[lower, indexName, upper] = exp.split("<=")
				range = IDBKeyRange.bound(string2Range lower, string2Range upper)
			when exp.match /^.+>.+>.+$/
				[upper, indexName, lower] = exp.split(">")
				range = IDBKeyRange.bound(string2Range lower, string2Range upper, true, true)
			when exp.match /^.+>=.+>.+$/
				[upper, indexName, lower] = exp.split(/>\=?/)
				range = IDBKeyRange.bound(string2Range lower, string2Range upper, false, true)
			when exp.match /^.+>.+>=.+$/
				[upper, indexName, lower] = exp.split(">\=?")
				range = IDBKeyRange.bound(string2Range lower, string2Range upper, true)
			when exp.match /^.+>=.+>=.+$/
				[upper, indexName, lower] = exp.split(">=")
				range = IDBKeyRange.bound(string2Range lower, string2Range upper)
			else
				throw new IDBError("Unknown statment (#{expression}).")
			
		new Query(@, indexName, range)
	
	
	#extract range string
	#examples:
	#  "[a,[b,c],4]" -> ["a",["b","c"],4]
	#  "['a,b',[c,'[d,e,f]'] -> ["a,b", ["c","[d,e,f]"]
	string2Range = (string)->
		if string.match /^\[.*\]$/
			(string2Range(str) for str in string[1...-1].match /(\[.+\]|'.+'|".+"|[^,]+)/g )
		else if not isNaN(string)
			+string
		else 
			if string.match /^('|").+('|")$/
				string[1...-1]
			else
				string
	
