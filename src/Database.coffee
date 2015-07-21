class Database
	
	_name =  #the database name
	
	_version =  #the database version
	
	_schema =  #the Schema object for this database
	
	_onVersionConflictHandler =  #IDBOpenDBRequest.onblocked handler
	
	_idbDatabase =  #the IDBDatabase object this object belong to
	
	_batchTx = null  #IDBTransaction object that used for batch process
	
	
	constructor: (dbName)->
		_name = dbName
	

	#return the database name
	name: ()->
		@getIDBDatabase().then (idb)->
			idb.name
	
	
	#if not parameters given, return the database's version
	#if paramters given, define the database with given version
	version: (versionNumber, dbDefination)->
		if not versionNumber
			@getIDBDatabase().then (idb)->
				idb.version
		
		#define the database only if the version is larger
		else if _version is null or _version <= versionNumber
			_schema = new Schema(dbDefination)
			_version = versionNumber
	
	
	#setter of IDBOpenDBRequest.onblocked handler
	onVersionConflict: (handler)->
		_onVersionConflictHandler = handler
	
	
	#getter of IDBDatabase object which this object refer to
	getIDBDatabase: ()->
		if _idbDatabase?
			newPromise _idbDatabase
		else
			r = indexedDB.open(_name, _version)
			r.onblocked = _onVersionConflictHandler
			r.onupgradeneeded = (event)-> doUpgrade(event.target.result)
			IDBRequest2Q( r ).then (event)->
				_idbDatabase = event.target.result
	
	
	#getter of IDBTransaction objects of this object
	#return _batchTx if set (by calling @batch)
	#or return a new IDBTransaction object
	getIDBTransaction: (storeNames, mode)->
		if _batchTx
			newPromise _batchTx
		else
			@getIDBDatabase().then (idb)->
				idb.transaction(storeNames, mode)
		
	
	store: (storeName)->
		new Store(storeName, @)
	
	
	#remove the database form disk
	#this object will no longer usable
	remove: ->
		IDBRequest2Q(indexDB.deleteDatabase(_name)).then ()->
			#clear
			_name = 
			_version = 
			_schema = 
			_onVersionConflictHandler = 
			_idbDatabase = 
			_batchTx = null
	
	
	#create a transaction for upcoming actions
	#usage: db.batch("store1", "store2", ...).run ()->...
	batch: (storeNames...)->
		#first, clear any previous batch transaction
		_batchTx = null
		
		#function to run when _batchTx ready
		batchFunc = null
		
		#get and set a new transaction to _batchTx
		@getIDBTransaction(storeNames, "readonly").then (tx)->
			_batchTx = tx
			
			#run if everything ready
			batchFunc() if batchFunc isnt null
		
		#return a runnable for setting batch function
		{} =
			run: (func)=>
				#construct the batchFunc
				batchFunc = ()=>
					try
						func(@)
					finally
						#clear after run
						batchFunc = null  
						_batchTx = null
				
				#run if everything ready
				batchFunc() if _batchTx isnt null
				
				#return promise of the transaction
				IDBTx2Q( _batchTx )
	
	
	doUpgrade = (idb)->
		
		if _schema is null
			throw new IDBError "Schema not found."
		
		#list of functions that make change to the db
		actions = []
		
		currentStoreNames = idb.objectStoreNames
		
		if currentStoreNames.length > 0
			tx = idb.transaction(currentStoreNames, "readwrite")
			
			for storeName in currentStoreNames
				do (storeName)->
					#update existed stores
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
		
