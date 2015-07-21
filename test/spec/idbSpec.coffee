describe "js-idb-wrapper tests", ->
	
	#initialize
	indexedDB = window.indexedDB or window.mozIndexedDB or window.webkitIndexedDB or window.msIndexedDB
	IDBTransaction = window.IDBTransaction or window.webkitIDBTransaction or window.msIDBTransaction
	IDBKeyRange = window.IDBKeyRange or window.webkitIDBKeyRange or window.msIDBKeyRange
	
	#remove any built db
	indexedDB.deleteDatabase "db1"
	
	#redefine the db
	IDB("db1")
		.version 1, 
			"store1": [
				"KEY(id) AUTO"
				"first_name"
				"last_name"
				"name(first_name + last_name)"
				"email UNIQUE"
				"age"
				"isPremiumMember"]
	
	dataToInsert = [
				first_name:      "AA"
				last_name:       "Ztest"
				email:           "test1@gmail.com"
				age:             20
				isPremiumMember: true
			,
				first_name:      "BB"
				last_name:       "Ytest"
				email:           "test2@yahoo.com"
				age:             22
			,
				first_name:      "CC"
				last_name:       "Xtest"
				email:           "test3@hotmail.com"
				age:             24
				isPremiumMember: true
			]
	
	
	
	describe "IDB('db1')", ->
		
		
		it "can return the name", (done)->
			
			IDB('db1').name()
			
			.then (dbName)->
				expect(dbName).toBe("db1")
				done()
			.catch fail
		
		
		
		
		it "can return the version", (done)->
			
			IDB('db1').version()
			
			.then (dbVersion)->
				expect(dbVersion).toEqual(1)
				done()
			.catch fail
	
	
	
	
	describe "IDB('db1').store('store1')", ->
		
		store1 = IDB('db1').store('store1')
		
		
		it "can return the name", (done)->
			
			store1.name()
			
			.then (storeName)->
				expect(storeName).toBe("store1")
				done()
			.catch fail
		
		
		
		
		it "can return the key path", (done)->
			
			store1.key()
			
			.then (keyPath)->
				expect(keyPath).toBe("id")
				done()
			.catch fail
		
		
		
		
		it "can return the index names", (done)->
			
			store1.indexes()
			
			.then (indexNames)->
				expect(indexNames.length).toBe(Object.keys(dataToInsert[0]).length + 1) # +1 for "name(first_name+last_name)"
				done()
			.catch fail
		
		
		
		
		it "can return whether key is auto increment", (done)->
			
			store1.isAutoKey()
			
			.then (isAutoIncrement)->
				expect(isAutoIncrement).toBeTruthy()
				done()
			.catch fail
		
		
		
		
		it "can add data", (done)->
			
			store1.add(dataToInsert[0])
			
			.then ->
				IDB('db1').store('store1').add(dataToInsert[1])
			.then ->
				IDB('db1').store('store1').add(dataToInsert[2])
			.then ->
				r = indexedDB.open "db1", 1
				r.onerror = fail
				r.onsuccess = (event)->
					db = event.target.result
					db.onerror = fail
					tx = db.transaction("store1", "readonly")
					store = tx.objectStore("store1")
					r2 = store.openCursor()
					r2.onerror = fail
					result = []
					r2.onsuccess = (event)->
						cursor = event.target.result
						if cursor
							result.push cursor.value
							cursor.continue()
						else
							validate()
					validate= ()->
						for i, r of result
							for key, value of dataToInsert[i]
								fail("value inconsistent.") if r[key] isnt value
						expect(result.length).toBe(3)
						done()
			.catch fail
		
		
		
		
		it "can iterates each object", (done)->
			results = []
			
			store1.all()
			.each (object, key)->
				results.push object
			.then ->
				expect(results.length).toBe(3)
				done()
			.catch fail
		
		
		
		
		it "can return all data in list", (done)->
			results = []
			
			store1.all()
			.list (objects, keys)->
				expect(objects.length).toBe(3)
				done()
			.catch fail
		
		
		
		
		it "can return the number of all items", (done)->
			results = []
			
			store1.all()
			.count (total)->
				expect(total).toBe(3)
				done()
			.catch fail
		
		
		
		###
		it "can return the number of items over specified index", (done)->
			results = []
			
			store1.where("isPremiumMember")
			.count (total)->
				expect(total).toBe(2)
				done()
			.catch fail
		###
		
		
		
		it "can query data using '='", (done)->
			
			store1.where "first_name = AA"
			.first (result)->
				expect(result.first_name).toBe("AA")
				done()
			.catch fail
		
		
		
		
		it "can query data using '<'", (done)->
			
			store1.where "age < 24"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a>b'", (done)->
			
			store1.where "age > 20"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a<=b'", (done)->
			
			store1.where "age <= 22"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a>=b'", (done)->
			
			store1.where "age >= 22"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a<b<c'", (done)->
			
			store1.where "20 < age < 24"
			.count (result)->
				expect(result).toBe(1)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a<=b<c'", (done)->
			
			store1.where "20 <= age < 24"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a<b<=c'", (done)->
			
			store1.where "20 < age <= 24"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a<=b<=c'", (done)->
			
			store1.where "20 <= age <= 24"
			.count (result)->
				expect(result).toBe(3)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a>b>c'", (done)->
			
			store1.where "24 > age > 20"
			.count (result)->
				expect(result).toBe(1)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a>=b>c'", (done)->
			
			store1.where "24 >= age > 20"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a>b>=c'", (done)->
			
			store1.where "24 > age >= 20"
			.count (result)->
				expect(result).toBe(2)
				done()
			.catch fail
		
		
		
		
		it "can query data using 'a>=b>=c'", (done)->
			
			store1.where "24 >= age >= 20"
			.count (result)->
				expect(result).toBe(3)
				done()
			.catch fail
		
		
		
		
	