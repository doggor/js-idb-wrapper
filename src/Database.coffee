class Database
	
	
	constructor: (dbName)->
		@_name = dbName                              #the database name
		@_version = null                             #the database version
		@_dbDefinition = null                        #the Schema object for this database
		@_idbDatabase = null                         #the IDBDatabase object this object belong to
		@_batchTx = null                             #IDBTransaction object that used for batch process
		@_onVersionConflictHandler = (event)->       #IDBOpenDBRequest.onblocked handler
			throw event
	
	
	
	
	#return the database name
	name: (cb)->
		@getIDBDatabase().then (idb)->cb(idb.name)
	
	
	
	
	#if not parameters given, return the database's version
	#if paramters given, define the database with given version
	version: (args...)->
		
		if args.length is 1
			cb = args[0]
			@getIDBDatabase().then (idb)->cb(idb.version)
		
		else if args.length is 2
			versionNumber = args[0]
			dbDefination = args[1]
			
			#define the database only if the version is larger
			if @_version is null or @_version <= versionNumber
				@_dbDefinition = dbDefination
				@_version = versionNumber
				
				#close current idb connection if any
				if @_idbDatabase isnt null
					@_idbDatabase.close()
					@_idbDatabase = 
					@_batchTx = null
				
				@  #return this for chaining
	
	
	
	
	#setter of IDBOpenDBRequest.onblocked handler
	onVersionConflict: (handler)->
		@_onVersionConflictHandler = handler
		
		@  #return this for chaining
	
	
	
	
	#getter of IDBDatabase object which this object refer to
	getIDBDatabase: ()->
		if @_idbDatabase?
			newPromise @_idbDatabase
		else
			r = indexedDB.open(@_name, @_version)
			r.onupgradeneeded = (event)=>@doUpgrade(event.target.result, event.target.transaction)
			r.onblocked = (event)=>
				if event.newVersion is @_version  #check if required version is defined
					return  #simply return
				else
					@_onVersionConflictHandler(event) if typeof @_onVersionConflictHandler is "function"
				
			IDBRequest2Q( r )
			.then (event)=>
				@_idbDatabase = event.target.result
	
	
	
	
	#getter of IDBTransaction objects of this object
	#return _batchTx if set (by calling @batch)
	#or return a new IDBTransaction object
	getIDBTransaction: (storeNames, mode)->
		if @_batchTx
			newPromise @_batchTx
		else
			@getIDBDatabase().then (idb)->
				idb.transaction(storeNames, mode)
	
	
	
	
	store: (storeName)->
		StoreManager(storeName, @)
	
	
	
	
	close: ->
		@_idbDatabase.close()
		@_idbDatabase = 
		@_batchTx = null
	
	
	
	
	#remove the database form disk
	#this object will no longer usable
	remove: ->
		r = indexedDB.deleteDatabase(@_name)
		deferred = newDefer()
		#ignore onblocked(IDBVersionChangeEvent) because we're deleteing db
		r.onblocked = deferred.resolve
		r.onerror = deferred.reject
		r.onsuccess = deferred.resolve
		(toPromise deferred)
		.then =>
			#clear all properties
			@_name = 
			@_version = 
			@_dbDefinition = 
			@_onVersionConflictHandler = 
			@_idbDatabase = 
			@_batchTx = null
	
	
	
	
	#create a transaction for upcoming actions
	#usage: db.batch("store1", "store2", ..., batchFunction)
	batch: (storeNames..., batchFunc)->
		
		#first, clear any previous batch transaction
		@_batchTx = null
		
		#get and set a new transaction to _batchTx
		@getIDBTransaction(storeNames, "readwrite").then (tx)=>
			@_batchTx = tx
			
			#run function
			try
				batchFunc.apply null, (@.store(storeName) for storeName in storeNames)
			finally
				@_batchTx = null #clear tx
			
			IDBTx2Q(tx)
					
	
	
	
	
	doUpgrade: (idb, tx)->
		
		if @_dbDefinition is null
			throw new IDBError "DB definition not found."
		
		_schema = new Schema(@_dbDefinition)
		
		#list of functions that make change to the db
		actions = []
		
		currentStoreNames = idb.objectStoreNames
		
		#update/remove indexes of current stores
		for storeName in currentStoreNames
			do (storeName)->
				if _schema.stores.hasOwnProperty storeName
					store = tx.objectStore(storeName)
					currentIndexNames = store.indexNames
					storeSchema = _schema.stores[storeName]
					
					for indexName in currentIndexNames
						do (indexName)->
							if storeSchema.indexes.hasOwnProperty indexName
								index = store.index(indexName)
								indexSchema = storeSchema.indexes[indexName]
								
								#adding UNIQUE for existed index is not allow
								if not index.unique and indexSchema.option.unique
									throw new IDBError("Turning existed index(#{indexName}) to be unique is not allowed.")
								
								#rebuild the index if any changes on schema
								#TAKE YOU"RE OWN RISK!!
								if (index.keyPath isnt indexSchema.key or
								index.unique isnt indexSchema.option.unique or
								index.multiEntry isnt indexSchema.option.multiEntry)
									actions.push ->store.deleteIndex(indexName)
									actions.push ->store.createIndex(indexName, indexSchema.key, indexSchema.option)
								
							#remove unused index
							else
								actions.push ->store.deleteIndex(indexName)
					
					#create newly added indexes
					for indexName, indexSchema of storeSchema.indexes when indexName not in currentIndexNames
						do (store, indexName, indexSchema)->
							actions.push ->
								store.createIndex(indexName, indexSchema.key, indexSchema.option)
				
				#remove unused stores
				else
					actions.push ->idb.deleteObjectStore(storeName)
		
		
		#create newly added stores
		for storeName, storeSchema of _schema.stores when storeName not in currentStoreNames
			store = idb.createObjectStore(storeName, storeSchema.option)
			
			for indexName, indexSchema of storeSchema.indexes
				do (store, indexName, indexSchema)->
					actions.push ->
						store.createIndex(indexName, indexSchema.key, indexSchema.option)
		
		
		#seems no any error, perform upgrade now
		action() for action in actions
	
