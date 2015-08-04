describe "Test: js-idb-wrapper", ->
	
	
	#initialize
	indexedDB = window.indexedDB or window.mozIndexedDB or window.webkitIndexedDB or window.msIndexedDB
	IDBTransaction = window.IDBTransaction or window.webkitIDBTransaction or window.msIDBTransaction
	IDBKeyRange = window.IDBKeyRange or window.webkitIDBKeyRange or window.msIDBKeyRange
	
	
	beforeAll (done)->
		#remove any built db
		r1 = indexedDB.deleteDatabase "db1"
		r1.onsuccess = ->
			r2 = indexedDB.deleteDatabase "db2"
			r2.onsuccess = ->done()
			r2.onerror = ->done.fail
		r1.onerror = ->done.fail
	
	
	
	
	describe "IDB('db1')", ->
		
		
		db1 = null
		
		
		beforeAll ->
			#define the db
			db1 = IDB("db1")
				.version 1, 
					"store1": [
						"KEY(id) AUTO"
						"name"
						"first_name(name.first)"
						"last_name(name.last)"
						"email UNIQUE"
						"age"
						"remark"]
					"store2": [
						"KEY AUTO"
						"todo"
						"created_date"]
		
		
		
		
		it "can return the name", (done)->
			
			db1.name (dbName)->
				expect(dbName).toBe("db1")
				done()
			.catch done.fail
		
		
		
		
		it "can return the version", (done)->
			
			db1.version (dbVersion)->
				expect(dbVersion).toBe(1)
				done()
			.catch done.fail
	
	
	
	
		describe "IDB('db1').store('store1')", ->
			
			
			store1 = dataToInsert = null
			
			
			beforeAll ->
				dataToInsert = [
						name:
							first:       "AA"
							last:        "Tester"
						email:           "test1@gmail.com"
						age:             20
						remark:          "first object"
					,
						name:
							first:       "BB"
							last:        "Tester"
						email:           "test2@yahoo.com"
						age:             22
					,
						name:
							first:       "CC"
							last:        "Tester"
						email:           "test3@hotmail.com"
						age:             24
						remark:          "last object"
					]
				
				store1 = db1.store('store1')
			
			
			
			
			it "can return the name", (done)->
				
				store1.name (storeName)->
					expect(storeName).toBe("store1")
					done()
				.catch done.fail
			
			
			
			
			it "can return the key path", (done)->
				
				store1.key (keyPath)->
					expect(keyPath).toBe("id")
					done()
				.catch done.fail
			
			
			
			
			it "can return the index names", (done)->
				
				store1.indexes (indexNames)->
					expect(indexNames).toContain("name")
					expect(indexNames).toContain("first_name")
					expect(indexNames).toContain("last_name")
					expect(indexNames).toContain("email")
					expect(indexNames).toContain("age")
					expect(indexNames).toContain("remark")
					done()
				.catch done.fail
			
			
			
			
			it "can return whether key is auto increment", (done)->
				
				store1.isAutoKey (isAutoIncrement)->
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
								expect(result[0].name).toEqual(first: "AA", last: "Tester")
								expect(result[1].name).toEqual(first: "BB", last: "Tester")
								expect(result[2].name).toEqual(first: "CC", last: "Tester")
								done()
				.catch done.fail
			
			
			
			
			it "can iterates each item", (done)->
				
				store1.all()
				.each (object, key)->
					object.name
				.then (names)->
					expect(names[0]).toEqual(first: "AA", last: "Tester")
					expect(names[1]).toEqual(first: "BB", last: "Tester")
					expect(names[2]).toEqual(first: "CC", last: "Tester")
					done()
				.catch done.fail
			
			
			
			
			it "can return all items in list", (done)->
				
				store1.all()
				.list (objects, keys)->
					expect(objects[0].name).toEqual(first: "AA", last: "Tester")
					expect(objects[1].name).toEqual(first: "BB", last: "Tester")
					expect(objects[2].name).toEqual(first: "CC", last: "Tester")
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
			
			
			
			
			it "can query index using 'a=b'", (done)->
				
				store1.where "last_name = Tester"
				.count (total)->
					expect(total).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a<b'", (done)->
				
				store1.where "age < 24"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a>b'", (done)->
				
				store1.where "age > 20"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a<=b'", (done)->
				
				store1.where "age <= 22"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a>=b'", (done)->
				
				store1.where "age >= 22"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a<b<c'", (done)->
				
				store1.where "20 < age < 24"
				.count (result)->
					expect(result).toBe(1)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a<=b<c'", (done)->
				
				store1.where "20 <= age < 24"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a<b<=c'", (done)->
				
				store1.where "20 < age <= 24"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a<=b<=c'", (done)->
				
				store1.where "20 <= age <= 24"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a>b>c'", (done)->
				
				store1.where "24 > age > 20"
				.count (result)->
					expect(result).toBe(1)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a>=b>c'", (done)->
				
				store1.where "24 >= age > 20"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a>b>=c'", (done)->
				
				store1.where "24 > age >= 20"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query index using 'a>=b>=c'", (done)->
				
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
			
			db1.batch "store1", "store2", (store1, store2)->
				
				store1.add
					first_name:      "DD"
					last_name:       "Tester"
					email:           "test4@gmail.com"
					age:             28
				
				store2.add
					todo:            "Task 1"
					created_date:    new Date()
				
				store2.add
					todo:            "Task 2"
					created_date:    new Date()
			
			.then ->
				
				store1Length = store2Length = null
				
				db1.store("store1").all().count (total)->
					expect(total).toBe(3)
				.then ->
					db1.store("store2").all().count (total)->
						expect(total).toBe(2)
				.then ->
					done()
			
			.catch done.fail
		
		
		
		
		it "can remove the database itself", (done)->
			
			db1.remove()
			.then ->
				expect(db1._idbDatabase).toBe(null)
				done()
			.catch done.fail
	
	
	
	
	
	
	
	
	describe "IDB('db2')", ->
		
		
		db2 = null
		
		
		beforeAll ->
			#define the db
			db2 = IDB("db2")
				.version 1, 
					"store1": [
						"KEY AUTO"
						"position(pos_x, pos_y) UNIQUE"
						"tags ARRAY"]
		
		
		
		
		it "can batch insert data as usual", (done)->
			
			store1 = db2.store("store1")
			
			db2.batch "store1", ->
				store1.add
					pos_x: 0
					pos_y: 0
					tags: ["html", "js", "css"]
				store1.add
					pos_x: 0
					pos_y: 1
					tags: ["js", "css"]
				store1.add
					pos_x: 1
					pos_y: 0
					tags: ["html"]
				store1.add
					pos_x: 1
					pos_y: 1
					tags: ["js", "html"]
				store1.add
					pos_x: 2
					pos_y: 1
					tags: ["css", "html"]
				store1.add
					pos_x: 3
					pos_y: 4
					tags: ["css", "js"]
			.then ->
				store1.all().count (total)->
					expect(total).toBe(6)
			.then ->
				done()
			.catch done.fail
		
		
		
		
		describe "IDB('db2').store('store1')", ->
			
			store1 = null
			
			
			beforeAll ->
				store1 = db2.store('store1')
			
			
			it "can query compound index using 'a=[x,y]'", (done)->
				
				store1.where "position = [1, 1]"
				.first (item)->
					expect(item.pos_x).toBe(1)
					expect(item.pos_y).toBe(1)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using 'a<[x,y]'", (done)->
				
				store1.where "position < [1,1]"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using 'a>[x,y]'", (done)->
				
				store1.where "position > [1,1]"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using 'a<=[x,y]'", (done)->
				
				store1.where "position <= [1,1]"
				.count (result)->
					expect(result).toBe(4)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using 'a>=[x,y]'", (done)->
				
				store1.where "position >= [1,1]"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]<b<[x2,y2]'", (done)->
				
				store1.where "[1,0] < position < [3,4]"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]<=b<[x2,y2]'", (done)->
				
				store1.where "[1,0] <= position < [3,4]"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]<b<=[x2,y2]'", (done)->
				
				store1.where "[1,0] < position <= [3,4]"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]<=a<=[x2,y2]'", (done)->
				
				store1.where "[0,0] <= position <= [1,1]"
				.list (items)->
					expect(items.length).toBe(4)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]>b>[x2,y2]'", (done)->
				
				store1.where "[3,4] > position > [1,1]"
				.count (result)->
					expect(result).toBe(1)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]>=b>[x2,y2]'", (done)->
				
				store1.where "[3,4] >= position > [1,1]"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]>b>=[x2,y2]'", (done)->
				
				store1.where "[3,4] > position >= [1,1]"
				.count (result)->
					expect(result).toBe(2)
					done()
				.catch done.fail
			
			
			
			
			it "can query compound index using '[x1,y1]>=b>=[x2,y2]'", (done)->
				
				store1.where "[3,4] >= position >= [1,1]"
				.count (result)->
					expect(result).toBe(3)
					done()
				.catch done.fail
			
			
			
			
			it "can query multi-entry using 'a=b'", (done)->
				
				store1.where "tags = html"
				.list (items)->
					expect(items.length).toBe(4)
					done()
				.catch done.fail
		
		
		
		
		describe "upgrade IDB('db2') to version 2", ->
			
			beforeAll ->
				#define the db2(v2)
				db2.version 2, 
					"store1": [
						"KEY AUTO"
						"pos_x",                  #adding new index
						"pos_y",                  #adding new index
						"position(pos_x, pos_y)"  #remove UNIQUE
						]                         #remove index:tags
			
			
			
			
			it "should has version number 2", (done)->
				
				db2.version (dbVersion)->
					expect(dbVersion).toBe(2)
					done()
				.catch done.fail
		
		
		
		
		describe "IDB('db2').store('store1')", ->
			
			store1 = null
			
			beforeAll ->
				store1 = db2.store('store1')
			
			
			it "should have new index collection", (done)->
				
				store1.indexes (indexNameList)->
					expect(indexNameList).toContain('pos_x')
					expect(indexNameList).toContain('pos_y')
					expect(indexNameList).toContain('position')
					expect(indexNameList).not.toContain('tags')
					done()
				.catch done.fail
			
			
			
			
			it "can access newly added index", (done)->
				
				store1.where "pos_x = 2"
				.list (items)->
					expect(items.length).toBe(1)
					done()
				.catch done.fail
			
			
			
			
			it "should not able to access removed index", (done)->
				
				store1.where "tags = html"
				.list (items)->
					done.fail("index:tags not yet removed as expected.")
				.catch (err)->
					expect(err.name).toBe("NotFoundError")
					done()
			
			
			
			
			it "can now add duplicated data to the index with 'UNIQUE' feature removed", (done)->
				
				store1.add
					pos_x: 0
					pos_y: 0
					tags: ["html"]
				.then ->
					store1.where("position = [0,0]").list (items)->
						expect(items.length).toBe(2)
						done()
				.catch done.fail
	
	
	
	
	
	
	afterAll ->
		indexedDB.deleteDatabase "db1"
		indexedDB.deleteDatabase "db2"
	
