DatabaseManager = do ->
	
	#cache Database objects
	dbs = {}
	
	#function to return
	accessor = (dbName)->
		dbs[dbName] = new Database(dbName) if not dbs.hasOwnProperty dbName
		dbs[dbName]
	
	#also attach IDBError for outer use
	accessor.Error = IDBError
	
	accessor
