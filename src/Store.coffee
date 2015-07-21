class Store
	
	_name =   #name of the store
	
	_db = null  #the Database object belong to
	
	
	#param (string) storeName
	#param (Database) db, the Database object belong to
	constructor: (storeName, db)->
		_name = storeName
		_db = db
	
	
	#getter of IDBObjectStore object  which this object refer to
	getIDBObjectStore: (mode = "readwrite")->
		_db.getIDBTransaction(_name, mode).then (tx)->
			tx.objectStore(_name)
	
	
	#return the key path of the store
	key: -> @getIDBObjectStore("readonly").then (idbStore)->idbStore.keyPath
	
	
	#return the name of the store
	name: -> @getIDBObjectStore("readonly").then (idbStore)->idbStore.name
	
	
	#return the list of indexes found in the store
	indexes: -> @getIDBObjectStore("readonly").then (idbStore)->idbStore.indexNames
	
	
	#return boolean indecating if the store key is auto increment
	isAutoKey: -> @getIDBObjectStore("readonly").then (idbStore)->idbStore.autoIncrement
	
	
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
	
	
	#return a new Query object that applying given expression
	where: (expression)->
		expression = expression.trim() if typeof expression is "string"
		
		[indexName , range] = switch
			
			when expression is null or expression is ""
				[null, null]
			
			# x <= index <= y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[1]), (extractStr matcher[3]) ]
			
			# x < index <= y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[1]), (extractStr matcher[3]), true ]
			
			# x <= index < y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[1]), (extractStr matcher[3]), false, true ]
			
			# x < index < y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[1]), (extractStr matcher[3]), true, true ]
			
			# x >= index >= y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[3]), (extractStr matcher[1]) ]
			
			# x > index >= y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[3]), (extractStr matcher[1]), true ]
			
			# x >= index > y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[3]), (extractStr matcher[1]), false, true ]
			
			# x > index > y
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[2]) , IDBKeyRange.bound (extractStr matcher[3]), (extractStr matcher[1]), true, true ]
			
			# index <= x
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[1]) , IDBKeyRange.upperBound (extractStr matcher[2]) ]
			
			# index < x
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[1]) , IDBKeyRange.upperBound (extractStr matcher[2]), true ]
			
			# index >= x
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[1]) , IDBKeyRange.lowerBound (extractStr matcher[2]) ]
			
			# index > x
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[1]) , IDBKeyRange.lowerBound (extractStr matcher[2]), true ]
			
			# index = x
			when matcher = expression.match /^('.*'|".*"|[^\s\t]+)[\s\t]*=[\s\t]*('.*'|".*"|[^\s\t]+)$/
				[ (extractStr matcher[1]) , IDBKeyRange.only (extractStr matcher[2]) ]
			
			#index
			#when matcher = expression.match /^('.*'|".*"|[^\s\t]+)$/
			#	[ (extractStr matcher[1]) , null ]
			
			else
				throw new IDBError("Unknown statment (#{expression}).")
		
		new Query(@, (indexName), range)
	
	
	#a shortcut of calling @where in which no any limitation apply
	all: ->
		@where(null)
	
	
	#extract range string
	#examples:
	#  "[a,[b,c],4]" -> ["a",["b","c"],4]
	#  "['a,b',[c,'[d,e,f]']" -> ["a,b", ["c","[d,e,f]"]
	#  "'a'" -> "a"
	extractStr = (string)->
		if string.match /^\[.*\]$/
			( extractStr str.trim() for str in string[1...-1].match /(\[.+\]|'.*'|".*"|[^,]+)/g )
		else if not isNaN(string)
			+string
		else
			if string.match /^('.*'|".*")$/
				string[1...-1]
			else
				string
	
