class Query
	
	_store =   #the Store object the query belong to
	_indexName =   #the name of theindex to query
	_range =   #the bound of the query
	_order = null  #the output order of the query result
	
	
	constructor: (store, indexName, range)->
		_store = store
		_indexName = indexName ? store.key()
		_range = range
	
	
	#setter of query result output order
	order: (direction)-> 
		if direction is -1 or (typeof direction is "string" and direction.match(/desc/))
			_order = "prev"
		else
			_order = null
		@
	
	
	#setter of result handler which iterate the result set
	#to stop iterating, return false from inside the handler
	each: (func)->
		d = newDefer()
		
		index = _store.getIDBObjectStore("readonly").index(_indexName)
		r = index.openCursor(range, _order)
		r.onsuccess = (event)->
			if cursor = event.target.result
				try
					if func(cursor.key, cursor.value, event) is false
						d.resolve(event)
					else
						cursor.continue()
				catch err
					d.reject(err)
			else
				d.resolve(event)
		r.onerror = (event)->d.reject(event)
		
		d.promise
	
	
	#setter of result handler in which only the first reached result will pass in
	first: (func)->
		index = _store.getIDBObjectStore("readonly").index(_indexName)
		IDBRequest2Q( index.get(range) ).then (event)->
			func(event.target.result)
	
	
	#setter of result handler in which the whole list of result will pass in
	list: (func)->
		result = []
		@each (value)-> result.push(value)
		.then func(result)
	
	
	#setter of result handler in which the total number of result objects will pass in
	count: (func)->
		index = _store.getIDBObjectStore("readonly").index(_indexName)
		IDBRequest2Q( index.count(_range) ).then (event)->
			func(event.target.result)
	
