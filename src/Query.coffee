class Query
	
	
	constructor: (store, indexName, range)->
		@_store = store            #the Store object the query belong to
		@_indexName = indexName    #the name of the index to query
		@_range = range            #the bound of the query
		@_limitTo = null           #the position of the end of the limited result set, null for no limit
		@_limitFrom = 0            #the position of the begining of the limited result set
		@_order = "next"           #the output order of the query result
	
	
	
	
	#return IDBIndex if indexName given on constructing, else return back the given IDBStore object
	getIDBIndexIfSet: (idbStore)->
		try
			if @_indexName
				idbStore.index(@_indexName)
			else
				idbStore
		catch err
			idbStore
			
	
	
	
	
	#setter of query result output order
	order: (direction)->
		@_order =
			if direction is -1 or (typeof direction is "string" and direction.match(/desc/i))
				"prev"
			else
				"next"
		@
	
	
	
	
	#setter of query result limitation
	# call @limit(5) to try getting the first 5 results
	# call @limit(3, 5) to try getting the 5 results placed after the 2nd one
	limit: (args...)->
		[ @_limitFrom , @_limitTo ] = switch args.length
			when 1
				length = args[0]
				throw new IDBError "length must be > 0 for Query.limit()" if typeof length isnt "number" or length < 1
				[ 0 , length - 1 ]
			when 2
				from = args[0]
				length = args[1]
				throw new IDBError "starting position must be > -1 for Query.limit()" if typeof from isnt "number" or from < 0
				throw new IDBError "length must be > 0 for Query.limit()" if typeof length isnt "number" or length < 1
				[ from , from + length - 1 ]
			else
				throw new IDBError "wrong usage of Query.limit()"
		@
	
	
	
	
	#setter of result handler which iterate the result set
	each: (func)->
		@_store.getIDBObjectStore("readonly")
		.then (idbStore)=>
			d = newDefer()
			
			cursorPosition = 0 #cursor position
			
			results = [] #store func() returns
			
			@getIDBIndexIfSet(idbStore)
			.openCursor(@_range, @_order)
			.onsuccess = (event)=>
				
				if cursor = event.target.result
					
					if cursorPosition < @_limitFrom
						cursor.advance(cursorPosition = @_limitFrom)
					
					else if @_limitTo isnt null and cursorPosition > @_limitTo
						d.resolve(results)
					
					else
						try
							result = func(cursor.value, cursor.key)
							results.push result if result isnt undefined
							cursorPosition++
							cursor.continue()
						catch err
							d.reject(err)
				
				else
					d.resolve(results)
			
			toPromise d
	
	
	
	
	#setter of result handler in which only the first reached result will pass in
	first: (func)->
		@limit(1)
		.each (object, key)->
			[object, key]
		.then (data)->
			if data.length > 0
				func(data[0][0], data[0][1])
			else
				func(null, null)
	
	
	
	
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
		@_store.getIDBObjectStore("readonly")
		.then (idbStore)=>
			IDBRequest2Q @getIDBIndexIfSet(idbStore).count(@_range)
		.then (event)->
			func(event.target.result)
	
