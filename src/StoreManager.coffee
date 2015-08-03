StoreManager = do ->
	
	#cache Database objects
	stores = {}
	
	#function to return
	(storeName, database)->
		key = database._name + "." + storeName
		stores[key] = new Store(storeName, database) if not stores.hasOwnProperty key
		stores[key]
