(function() {
  describe("Test: js-idb-wrapper", function() {
    var IDBKeyRange, IDBTransaction, indexedDB;
    indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    beforeAll(function() {
      return indexedDB.deleteDatabase("db1");
    });
    return describe("IDB('db1') in version 1", function() {
      var db1;
      db1 = null;
      beforeAll(function() {
        return db1 = IDB("db1").version(1, {
          "store1": ["KEY(id) AUTO", "first_name", "last_name", "name(first_name + last_name)", "email UNIQUE", "age", "remark"],
          "store2": ["KEY AUTO", "todo", "created_date"]
        });
      });
      it("can return the name", function(done) {
        return db1.name().then(function(dbName) {
          expect(dbName).toBe("db1");
          return done();
        })["catch"](done.fail);
      });
      it("can return the version", function(done) {
        return db1.version().then(function(dbVersion) {
          expect(dbVersion).toEqual(1);
          return done();
        })["catch"](done.fail);
      });
      describe("store('store1')", function() {
        var dataToInsert, store1;
        store1 = dataToInsert = null;
        beforeAll(function() {
          dataToInsert = [
            {
              first_name: "AA",
              last_name: "Tester",
              email: "test1@gmail.com",
              age: 20,
              remark: "it should contains all indexes"
            }, {
              first_name: "BB",
              last_name: "Tester",
              email: "test2@yahoo.com",
              age: 22
            }, {
              first_name: "CC",
              last_name: "Tester",
              email: "test3@hotmail.com",
              age: 24,
              remark: "last object"
            }
          ];
          return store1 = db1.store('store1');
        });
        it("can return the name", function(done) {
          return store1.name().then(function(storeName) {
            expect(storeName).toBe("store1");
            return done();
          })["catch"](done.fail);
        });
        it("can return the key path", function(done) {
          return store1.key().then(function(keyPath) {
            expect(keyPath).toBe("id");
            return done();
          })["catch"](done.fail);
        });
        it("can return the index names", function(done) {
          return store1.indexes().then(function(indexNames) {
            expect(indexNames.length).toBe(Object.keys(dataToInsert[0]).length + 1);
            return done();
          })["catch"](done.fail);
        });
        it("can return whether key is auto increment", function(done) {
          return store1.isAutoKey().then(function(isAutoIncrement) {
            expect(isAutoIncrement).toBeTruthy();
            return done();
          })["catch"](done.fail);
        });
        it("can add items", function(done) {
          return store1.add(dataToInsert[0]).then(function() {
            return IDB('db1').store('store1').add(dataToInsert[1]);
          }).then(function() {
            return IDB('db1').store('store1').add(dataToInsert[2]);
          }).then(function() {
            var r;
            r = indexedDB.open("db1", 1);
            r.onerror = done.fail;
            return r.onsuccess = function(event) {
              var db, r2, result, store, tx, validate;
              db = event.target.result;
              db.onerror = done.fail;
              tx = db.transaction("store1", "readonly");
              store = tx.objectStore("store1");
              r2 = store.openCursor();
              r2.onerror = done.fail;
              result = [];
              r2.onsuccess = function(event) {
                var cursor;
                cursor = event.target.result;
                if (cursor) {
                  result.push(cursor.value);
                  return cursor["continue"]();
                } else {
                  return validate();
                }
              };
              return validate = function() {
                var i, key, ref, value;
                for (i in result) {
                  r = result[i];
                  ref = dataToInsert[i];
                  for (key in ref) {
                    value = ref[key];
                    if (r[key] !== value) {
                      done.fail("value inconsistent.");
                    }
                  }
                }
                expect(result.length).toBe(3);
                return done();
              };
            };
          })["catch"](done.fail);
        });
        it("can iterates each item", function(done) {
          return store1.all().each(function(object, key) {
            return object;
          }).then(function(objects) {
            expect(objects.length).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can return all items in list", function(done) {
          return store1.all().list(function(objects, keys) {
            expect(objects.length).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can return all items in reversed order", function(done) {
          var orderedList, reversedList;
          orderedList = reversedList = null;
          return store1.all().list(function(objects, keys) {
            return orderedList = objects;
          }).then(function() {
            return store1.all().order("DESC").list(function(objects, keys) {
              return reversedList = objects;
            });
          }).then(function() {
            expect(orderedList.reverse()).toEqual(reversedList);
            return done();
          })["catch"](done.fail);
        });
        it("can use either .order('DESC') or .order(-1) to reverse the result list", function(done) {
          var reversedList1, reversedList2;
          reversedList1 = reversedList2 = null;
          return store1.all().order("DESC").list(function(objects, keys) {
            return reversedList1 = objects;
          }).then(function() {
            return store1.all().order(-1).list(function(objects, keys) {
              return reversedList2 = objects;
            });
          }).then(function() {
            expect(reversedList1).toEqual(reversedList2);
            return done();
          })["catch"](done.fail);
        });
        it("can return the number of all items", function(done) {
          return store1.all().count(function(total) {
            expect(total).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can return the number of items under specified index", function(done) {
          return store1.where("remark").count(function(total) {
            expect(total).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a=b'", function(done) {
          return store1.where("last_name = Tester").count(function(total) {
            expect(total).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a<b'", function(done) {
          return store1.where("age < 24").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a>b'", function(done) {
          return store1.where("age > 20").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a<=b'", function(done) {
          return store1.where("age <= 22").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a>=b'", function(done) {
          return store1.where("age >= 22").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a<b<c'", function(done) {
          return store1.where("20 < age < 24").count(function(result) {
            expect(result).toBe(1);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a<=b<c'", function(done) {
          return store1.where("20 <= age < 24").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a<b<=c'", function(done) {
          return store1.where("20 < age <= 24").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a<=b<=c'", function(done) {
          return store1.where("20 <= age <= 24").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a>b>c'", function(done) {
          return store1.where("24 > age > 20").count(function(result) {
            expect(result).toBe(1);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a>=b>c'", function(done) {
          return store1.where("24 >= age > 20").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a>b>=c'", function(done) {
          return store1.where("24 > age >= 20").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query data using 'a>=b>=c'", function(done) {
          return store1.where("24 >= age >= 20").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can return the first item of query result set", function(done) {
          return store1.where("first_name").first(function(object, indexValue) {
            expect(indexValue).toBe("AA");
            return done();
          })["catch"](done.fail);
        });
        it("can update item", function(done) {
          var query;
          query = store1.where("first_name = AA");
          return query.first(function(item) {
            item.age = 18;
            return store1.update(item);
          }).then(function() {
            return query.first(function(item) {
              expect(item.age).toBe(18);
              return done();
            });
          })["catch"](done.fail);
        });
        return it("can delete item", function(done) {
          var query;
          query = store1.where("first_name = CC");
          return query.first(function(item) {
            return store1["delete"](item.id);
          }).then(function() {
            return query.list(function(items) {
              expect(items.length).toBe(0);
              return done();
            });
          })["catch"](done.fail);
        });
      });
      return it("can operates multi-stores in once", function(done) {
        return db1.batch("store1", "store2").run(function() {
          db1.store("store1").add({
            first_name: "DD",
            last_name: "Tester",
            email: "test4@gmail.com",
            age: 28
          });
          return db1.store("store2").add({
            todo: "check results",
            created_date: new Date()
          });
        }).then(function() {
          var store1Length, store2Length;
          store1Length = store2Length = null;
          return db1.store("store1").all().count(function(total) {
            return store1Length = total;
          }).then(function() {
            return db1.store("store2").all().count(function(total) {
              return store2Length = total;
            });
          }).then(function() {
            expect([store1Length, store2Length]).toEqual([3, 1]);
            return done();
          })["catch"](done.fail);
        });
      });

      /*
      		afterAll (done)->
      			#close db1
      			db1.close()
      			
      			console.log "wait 4 seconds to complete db closing..."
      			setTimeout ->
      				done()
      			, 4000
       */
    });

    /*
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
     */
  });

}).call(this);
