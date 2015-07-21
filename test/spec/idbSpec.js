(function() {
  describe("js-idb-wrapper tests", function() {
    var IDBKeyRange, IDBTransaction, dataToInsert, indexedDB;
    indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    indexedDB.deleteDatabase("db1");
    IDB("db1").version(1, {
      "store1": ["KEY(id) AUTO", "first_name", "last_name", "name(first_name + last_name)", "email UNIQUE", "age", "isPremiumMember"]
    });
    dataToInsert = [
      {
        first_name: "AA",
        last_name: "Ztest",
        email: "test1@gmail.com",
        age: 20,
        isPremiumMember: true
      }, {
        first_name: "BB",
        last_name: "Ytest",
        email: "test2@yahoo.com",
        age: 22
      }, {
        first_name: "CC",
        last_name: "Xtest",
        email: "test3@hotmail.com",
        age: 24,
        isPremiumMember: true
      }
    ];
    describe("IDB('db1')", function() {
      it("can return the name", function(done) {
        return IDB('db1').name().then(function(dbName) {
          expect(dbName).toBe("db1");
          return done();
        })["catch"](fail);
      });
      return it("can return the version", function(done) {
        return IDB('db1').version().then(function(dbVersion) {
          expect(dbVersion).toEqual(1);
          return done();
        })["catch"](fail);
      });
    });
    return describe("IDB('db1').store('store1')", function() {
      var store1;
      store1 = IDB('db1').store('store1');
      it("can return the name", function(done) {
        return store1.name().then(function(storeName) {
          expect(storeName).toBe("store1");
          return done();
        })["catch"](fail);
      });
      it("can return the key path", function(done) {
        return store1.key().then(function(keyPath) {
          expect(keyPath).toBe("id");
          return done();
        })["catch"](fail);
      });
      it("can return the index names", function(done) {
        return store1.indexes().then(function(indexNames) {
          expect(indexNames.length).toBe(Object.keys(dataToInsert[0]).length + 1);
          return done();
        })["catch"](fail);
      });
      it("can return whether key is auto increment", function(done) {
        return store1.isAutoKey().then(function(isAutoIncrement) {
          expect(isAutoIncrement).toBeTruthy();
          return done();
        })["catch"](fail);
      });
      it("can add data", function(done) {
        return store1.add(dataToInsert[0]).then(function() {
          return IDB('db1').store('store1').add(dataToInsert[1]);
        }).then(function() {
          return IDB('db1').store('store1').add(dataToInsert[2]);
        }).then(function() {
          var r;
          r = indexedDB.open("db1", 1);
          r.onerror = fail;
          return r.onsuccess = function(event) {
            var db, r2, result, store, tx, validate;
            db = event.target.result;
            db.onerror = fail;
            tx = db.transaction("store1", "readonly");
            store = tx.objectStore("store1");
            r2 = store.openCursor();
            r2.onerror = fail;
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
                    fail("value inconsistent.");
                  }
                }
              }
              expect(result.length).toBe(3);
              return done();
            };
          };
        })["catch"](fail);
      });
      it("can iterates each object", function(done) {
        var results;
        results = [];
        return store1.all().each(function(object, key) {
          return results.push(object);
        }).then(function() {
          expect(results.length).toBe(3);
          return done();
        })["catch"](fail);
      });
      it("can return all data in list", function(done) {
        var results;
        results = [];
        return store1.all().list(function(objects, keys) {
          expect(objects.length).toBe(3);
          return done();
        })["catch"](fail);
      });
      it("can return the number of all items", function(done) {
        var results;
        results = [];
        return store1.all().count(function(total) {
          expect(total).toBe(3);
          return done();
        })["catch"](fail);
      });

      /*
      		it "can return the number of items over specified index", (done)->
      			results = []
      			
      			store1.where("isPremiumMember")
      			.count (total)->
      				expect(total).toBe(2)
      				done()
      			.catch fail
       */
      it("can query data using '='", function(done) {
        return store1.where("first_name = AA").first(function(result) {
          expect(result.first_name).toBe("AA");
          return done();
        })["catch"](fail);
      });
      it("can query data using '<'", function(done) {
        return store1.where("age < 24").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a>b'", function(done) {
        return store1.where("age > 20").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a<=b'", function(done) {
        return store1.where("age <= 22").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a>=b'", function(done) {
        return store1.where("age >= 22").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a<b<c'", function(done) {
        return store1.where("20 < age < 24").count(function(result) {
          expect(result).toBe(1);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a<=b<c'", function(done) {
        return store1.where("20 <= age < 24").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a<b<=c'", function(done) {
        return store1.where("20 < age <= 24").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a<=b<=c'", function(done) {
        return store1.where("20 <= age <= 24").count(function(result) {
          expect(result).toBe(3);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a>b>c'", function(done) {
        return store1.where("24 > age > 20").count(function(result) {
          expect(result).toBe(1);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a>=b>c'", function(done) {
        return store1.where("24 >= age > 20").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      it("can query data using 'a>b>=c'", function(done) {
        return store1.where("24 > age >= 20").count(function(result) {
          expect(result).toBe(2);
          return done();
        })["catch"](fail);
      });
      return it("can query data using 'a>=b>=c'", function(done) {
        return store1.where("24 >= age >= 20").count(function(result) {
          expect(result).toBe(3);
          return done();
        })["catch"](fail);
      });
    });
  });

}).call(this);
