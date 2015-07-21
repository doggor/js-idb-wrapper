class Query
	
	_store =         #the Store object the query belong to
	_indexName =     #the name of theindex to query
	_range = null    #the bound of the query
	_order = "next"  #the output order of the query result
	
	
	constructor: (store, indexName, range)->
		_store = store
		_indexName = indexName
		_range = range
	
	
	#setter of query result output order
	order: (direction)-> 
		if direction is -1 or (typeof direction is "string" and direction.match(/desc/))
			_order = "prev"
		else
			_order = "next"
		@
	
	
	#setter of result handler which iterate the result set
	each: (func)->
		_store.getIDBObjectStore("readonly")
		.then (idbStore)->
			d = newDefer()
			
			cursorRequest = (getIDBIndexIfSet idbStore).openCursor(_range, _order)
			
			cursorRequest.onsuccess = (event)->
				
				if cursor = event.target.result
					try
						func(cursor.value, cursor.key)
						cursor.continue()
					catch err
						d.reject(err)
				else
					d.resolve()
			
			toPromise d
	
	#setter of result handler in which only the first reached result will pass in
	first: (func)->
		_store.getIDBObjectStore("readonly")
		.then (idbStore)->
			IDBRequest2Q (getIDBIndexIfSet idbStore).get(_range)
		.then (event)->
			func(event.target.result)
	
	
	#setter of result handler in which the whole list of result will pass in
	list: (func)->
		objects = []
		keys = []
		@each (object, key)->
			objects.push object
			keys.push key
		.then ->
			func(objects, keys)
	
	
	#setter of result handler in which the total number of result objects will pass in
	count: (func)->
		_store.getIDBObjectStore("readonly")
		.then (idbStore)->
			IDBRequest2Q (getIDBIndexIfSet idbStore).count(_range)
		.then (event)->
			func(event.target.result)
	
	
	#return IDBIndex if indexName given on constructing, else return back the given IDBStore object
	getIDBIndexIfSet = (idbStore)->
		if _indexName then idbStore.index(_indexName) else idbStore
