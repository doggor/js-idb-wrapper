describe "Test: js-idb-wrapper", ->
	
	
	#initialize
	indexedDB = window.indexedDB or window.mozIndexedDB or window.webkitIndexedDB or window.msIndexedDB
	IDBTransaction = window.IDBTransaction or window.webkitIDBTransaction or window.msIDBTransaction
	IDBKeyRange = window.IDBKeyRange or window.webkitIDBKeyRange or window.msIDBKeyRange
	
	
	beforeAll ->
		#remove any built db
		indexedDB.deleteDatabase "db1"
	
	
	
	
	describe "IDB('db1') in version 1", ->
		
		
		db1 = null
		
		
		beforeAll ->
			#define the db
			db1 = IDB("db1")
				.version 1, 
					"store1": [
						"KEY(id) AUTO"
						"first_name"
						"last_name"
						"name(first_name + last_name)"
						"email UNIQUE"
						"age"
						"remark"]
					"store2": [
						"KEY AUTO"
						"todo"
						"created_date"]
		
		
		
		
		it "can return the name", (done)->
			
			db1.name()
			.then (dbName)->
				expect(dbName).toBe("db1")
				done()
			.catch done.fail
		
		
		
		
		it "can return the version", (done)->
			
			db1.version()
			.then (dbVersion)->
				expect(dbVersion).toEqual(1)
				done()
			.catch done.fail
	
	
	
	
		describe "store('store1')", ->
			
			
			store1 = dataToInsert = null
			
			
			beforeAll ->
				dataToInsert = [
						first_name:      "AA"
						last_name:       "Tester"
						email:           "test1@gmail.com"
						age:             20
						remark:          "it should contains all indexes"
					,
						first_name:      "BB"
						last_name:       "Tester"
						email:           "test2@yahoo.com"
						age:             22
					,
						first_name:      "CC"
						last_name:       "Tester"
						email:           "test3@hotmail.com"
						age:             24
						remark:          "last object"
					]
				
				store1 = db1.store('store1')
			
			
			
			
			it "can return the name", (done)->
				
				store1.name()
				.then (storeName)->
					expect(storeName).toBe("store1")
					done()
				.catch done.fail
			
			
			
			
			it "can return the key path", (done)->
				
				store1.key()
				.then (keyPath)->
					expect(keyPath).toBe("id")
					done()
				.catch done.fail
			
			
			
			
			it "can return the index names", (done)->
				
				store1.indexes()
				.then (indexNames)->
					expect(indexNames.length).toBe(Object.keys(dataToInsert[0]).length + 1) # +1 for "name(first_name+last_name)"
					done()
				.catch done.fail
			
			
			
			
			it "can return whether key is auto increment", (done)->
				
				store1.isAutoKey()
				.then (isAutoIncrement)->
					expect(isAutoIncrement).toBeTruthy()
					done()
				.catch done.fail
			
			
			
			
			it "can add items", (done)->
				
				store1.add(dataToInsert[0])
				.then ->
					IDB('db1').store('store1').add(dataToInsert[1])
				.then ->
					IDB('db1').store('store1').add(dataToInsert[2])
				.then ->
					r = indexedDB.open "db1", 1
					r.onerror = done.fail
					r.onsuccess = (event)->
						db = event.target.result
						db.onerror = done.fail
						tx = db.transaction("store1", "readonly")
						store = tx.objectStore("store1")
						r2 = store.openCursor()
						r2.onerror = done.fail
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
									done.fail("value inconsistent.") if r[key] isnt value
							expect(result.length).toBe(3)
							done()
				.catch done.fail
			
			
			
			
			it "can iterates each item", (done)->
				
				store1.all()
				.each (object, key)->
					object
				.then (objects)->
					expect(objects.length).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can return all items in list", (done)->
				
				store1.all()
				.list (objects, keys)->
					expect(objects.length).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can return all items in reversed order", (done)->
				
				orderedList = reversedList = null
				
				store1.all()
				.list (objects, keys)->
					orderedList = objects
				.then ->
					store1.all().order("DESC")
					.list (objects, keys)->
						reversedList = objects
				.then ->
					expect(orderedList.reverse()).toEqual(reversedList)
					done()
				.catch done.fail
			
			
			
			
			it "can use either .order('DESC') or .order(-1) to reverse the result list", (done)->
				
				reversedList1 = reversedList2 = null
				
				store1.all().order("DESC")
					.list (objects, keys)->
						reversedList1 = objects
				.then ->
					store1.all().order(-1)
					.list (objects, keys)->
						reversedList2 = objects
				.then ->
					expect(reversedList1).toEqual(reversedList2)
					done()
				.catch done.fail
			
			
			
			
			it "can return the number of all items", (done)->
				
				store1.all()
				.count (total)->
					expect(total).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can return the number of items under specified index", (done)->
				
				store1.where("remark")
				.count (total)->
					expect(total).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a=b'", (done)->
				
				store1.where "last_name = Tester"
				.count (total)->
					expect(total).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a<b'", (done)->
				
				store1.where "age < 24"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a>b'", (done)->
				
				store1.where "age > 20"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a<=b'", (done)->
				
				store1.where "age <= 22"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a>=b'", (done)->
				
				store1.where "age >= 22"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a<b<c'", (done)->
				
				store1.where "20 < age < 24"
				.count (result)->
					expect(result).toBe(1)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a<=b<c'", (done)->
				
				store1.where "20 <= age < 24"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a<b<=c'", (done)->
				
				store1.where "20 < age <= 24"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a<=b<=c'", (done)->
				
				store1.where "20 <= age <= 24"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a>b>c'", (done)->
				
				store1.where "24 > age > 20"
				.count (result)->
					expect(result).toBe(1)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a>=b>c'", (done)->
				
				store1.where "24 >= age > 20"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a>b>=c'", (done)->
				
				store1.where "24 > age >= 20"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query data using 'a>=b>=c'", (done)->
				
				store1.where "24 >= age >= 20"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can return the first item of query result set", (done)->
				
				store1.where("first_name")
				.first (object, indexValue)->
					expect(indexValue).toBe("AA")
					done()
				.catch done.fail
			
			
			
			
			it "can update item", (done)->
				
				query = store1.where("first_name = AA")
				
				query.first (item)->
					item.age = 18
					store1.update(item)
				.then ->
					query.first (item)->
						expect(item.age).toBe(18)
						done()
				.catch done.fail
			
			
			
			
			it "can delete item", (done)->
				
				query = store1.where("first_name = CC")
				
				query.first (item)->
					store1.delete(item.id)
				.then ->
					query.list (items)->
						expect(items.length).toBe(0)
						done()
				.catch done.fail
			
			
			
			
		it "can operates multi-stores in once", (done)->
			
			db1.batch("store1", "store2").run ->
				
				db1.store("store1").add
					first_name:      "DD"
					last_name:       "Tester"
					email:           "test4@gmail.com"
					age:             28
				
				db1.store("store2").add
					todo:            "check results"
					created_date:    new Date()
			
			.then ->
				
				store1Length = store2Length = null
				
				db1.store("store1").all().count (total)->
					store1Length = total
				.then ->
					db1.store("store2").all().count (total)->
						store2Length = total
				.then ->
					expect([store1Length, store2Length]).toEqual([3, 1])
					done()
				.catch done.fail
		
		
		
		###
		afterAll (done)->
			#close db1
			db1.close()
			
			console.log "wait 4 seconds to complete db closing..."
			setTimeout ->
				done()
			, 4000
		###
	
	
	
	
	###
	describe "IDB('db1') in version 2", ->
		
		
		db1 = null
		
		
		beforeAll ->
			#define the db's version 2
			db1 = IDB("db1")
				.version 2, 
					"store1": [
						"KEY(id) AUTO"
						"first_name"
						"last_name"
						"name(first_name + last_name)"
						"email"                        #remove UNIQUE
						"age"
						]                              #remove index "remark"
					                                   #remove store2
					"store3": [                        #new object store
						"KEY(latitude, longitude)"
						"name"
						"description"]
			db1.onVersionConflict (event)->console.error event
		
		
		
		
		describe "store('store1')", ->
			
			
			store1 = null
			
			
			beforeAll ->
				store1 = db1.store('store1')
			
			
			it "can list item", (done)->
				store1.all().list (items)->
					console.log items
					expect(items).toEqual(items)
			
			
			it "can no longer use store1.remark index", (done)->
				
				store1.where "remark"
				.count (length)->
					console.log "count()"
					done.fail "store1.remark's length return #{length}"
				.then ->
					console.log "then"
				.catch (err)->
					console.log err
					expect(err).toBe(err)
					done()
		
		
		
		###
		#TODO: db upgrade test
		
		#TODO db remove test
	
	
