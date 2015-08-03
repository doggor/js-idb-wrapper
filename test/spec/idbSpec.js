(function() {
  describe("Test: js-idb-wrapper", function() {
    var IDBKeyRange, IDBTransaction, indexedDB;
    indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    beforeAll(function(done) {
      var r1;
      r1 = indexedDB.deleteDatabase("db1");
      r1.onsuccess = function() {
        var r2;
        r2 = indexedDB.deleteDatabase("db2");
        r2.onsuccess = function() {
          return done();
        };
        return r2.onerror = function() {
          return done.fail;
        };
      };
      return r1.onerror = function() {
        return done.fail;
      };
    });
    describe("IDB('db1')", function() {
      var db1;
      db1 = null;
      beforeAll(function() {
        return db1 = IDB("db1").version(1, {
          "store1": ["KEY(id) AUTO", "name", "first_name(name.first)", "last_name(name.last)", "email UNIQUE", "age", "remark"],
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
          expect(dbVersion).toBe(1);
          return done();
        })["catch"](done.fail);
      });
      describe("IDB('db1').store('store1')", function() {
        var dataToInsert, store1;
        store1 = dataToInsert = null;
        beforeAll(function() {
          dataToInsert = [
            {
              name: {
                first: "AA",
                last: "Tester"
              },
              email: "test1@gmail.com",
              age: 20,
              remark: "first object"
            }, {
              name: {
                first: "BB",
                last: "Tester"
              },
              email: "test2@yahoo.com",
              age: 22
            }, {
              name: {
                first: "CC",
                last: "Tester"
              },
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
            expect(indexNames).toContain("name");
            expect(indexNames).toContain("first_name");
            expect(indexNames).toContain("last_name");
            expect(indexNames).toContain("email");
            expect(indexNames).toContain("age");
            expect(indexNames).toContain("remark");
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
              var db, r2, result, store, tx;
              db = event.target.result;
              db.onerror = done.fail;
              tx = db.transaction("store1", "readonly");
              store = tx.objectStore("store1");
              r2 = store.openCursor();
              r2.onerror = done.fail;
              result = [];
              return r2.onsuccess = function(event) {
                var cursor;
                cursor = event.target.result;
                if (cursor) {
                  result.push(cursor.value);
                  return cursor["continue"]();
                } else {
                  expect(result[0].name).toEqual({
                    first: "AA",
                    last: "Tester"
                  });
                  expect(result[1].name).toEqual({
                    first: "BB",
                    last: "Tester"
                  });
                  expect(result[2].name).toEqual({
                    first: "CC",
                    last: "Tester"
                  });
                  return done();
                }
              };
            };
          })["catch"](done.fail);
        });
        it("can iterates each item", function(done) {
          return store1.all().each(function(object, key) {
            return object.name;
          }).then(function(names) {
            expect(names[0]).toEqual({
              first: "AA",
              last: "Tester"
            });
            expect(names[1]).toEqual({
              first: "BB",
              last: "Tester"
            });
            expect(names[2]).toEqual({
              first: "CC",
              last: "Tester"
            });
            return done();
          })["catch"](done.fail);
        });
        it("can return all items in list", function(done) {
          return store1.all().list(function(objects, keys) {
            expect(objects[0].name).toEqual({
              first: "AA",
              last: "Tester"
            });
            expect(objects[1].name).toEqual({
              first: "BB",
              last: "Tester"
            });
            expect(objects[2].name).toEqual({
              first: "CC",
              last: "Tester"
            });
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
        it("can query index using 'a=b'", function(done) {
          return store1.where("last_name = Tester").count(function(total) {
            expect(total).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a<b'", function(done) {
          return store1.where("age < 24").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a>b'", function(done) {
          return store1.where("age > 20").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a<=b'", function(done) {
          return store1.where("age <= 22").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a>=b'", function(done) {
          return store1.where("age >= 22").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a<b<c'", function(done) {
          return store1.where("20 < age < 24").count(function(result) {
            expect(result).toBe(1);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a<=b<c'", function(done) {
          return store1.where("20 <= age < 24").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a<b<=c'", function(done) {
          return store1.where("20 < age <= 24").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a<=b<=c'", function(done) {
          return store1.where("20 <= age <= 24").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a>b>c'", function(done) {
          return store1.where("24 > age > 20").count(function(result) {
            expect(result).toBe(1);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a>=b>c'", function(done) {
          return store1.where("24 >= age > 20").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a>b>=c'", function(done) {
          return store1.where("24 > age >= 20").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query index using 'a>=b>=c'", function(done) {
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
      it("can operates multi-stores in once", function(done) {
        return db1.batch("store1", "store2", function(store1, store2) {
          store1.add({
            first_name: "DD",
            last_name: "Tester",
            email: "test4@gmail.com",
            age: 28
          });
          store2.add({
            todo: "Task 1",
            created_date: new Date()
          });
          return store2.add({
            todo: "Task 2",
            created_date: new Date()
          });
        }).then(function() {
          var store1Length, store2Length;
          store1Length = store2Length = null;
          return db1.store("store1").all().count(function(total) {
            return expect(total).toBe(3);
          }).then(function() {
            return db1.store("store2").all().count(function(total) {
              return expect(total).toBe(2);
            });
          }).then(function() {
            return done();
          });
        })["catch"](done.fail);
      });
      return it("can remove the database itself", function(done) {
        return db1.remove().then(function() {
          expect(db1._idbDatabase).toBe(null);
          return done();
        })["catch"](done.fail);
      });
    });
    describe("IDB('db2')", function() {
      var db2;
      db2 = null;
      beforeAll(function() {
        return db2 = IDB("db2").version(1, {
          "store1": ["KEY AUTO", "position(pos_x, pos_y) UNIQUE", "tags ARRAY"]
        });
      });
      it("can batch insert data as usual", function(done) {
        var store1;
        store1 = db2.store("store1");
        return db2.batch("store1", function() {
          store1.add({
            pos_x: 0,
            pos_y: 0,
            tags: ["html", "js", "css"]
          });
          store1.add({
            pos_x: 0,
            pos_y: 1,
            tags: ["js", "css"]
          });
          store1.add({
            pos_x: 1,
            pos_y: 0,
            tags: ["html"]
          });
          store1.add({
            pos_x: 1,
            pos_y: 1,
            tags: ["js", "html"]
          });
          store1.add({
            pos_x: 2,
            pos_y: 1,
            tags: ["css", "html"]
          });
          return store1.add({
            pos_x: 3,
            pos_y: 4,
            tags: ["css", "js"]
          });
        }).then(function() {
          return store1.all().count(function(total) {
            return expect(total).toBe(6);
          });
        }).then(function() {
          return done();
        })["catch"](done.fail);
      });
      describe("IDB('db2').store('store1')", function() {
        var store1;
        store1 = null;
        beforeAll(function() {
          return store1 = db2.store('store1');
        });
        it("can query compound index using 'a=[x,y]'", function(done) {
          return store1.where("position = [1, 1]").first(function(item) {
            expect(item.pos_x).toBe(1);
            expect(item.pos_y).toBe(1);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using 'a<[x,y]'", function(done) {
          return store1.where("position < [1,1]").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using 'a>[x,y]'", function(done) {
          return store1.where("position > [1,1]").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using 'a<=[x,y]'", function(done) {
          return store1.where("position <= [1,1]").count(function(result) {
            expect(result).toBe(4);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using 'a>=[x,y]'", function(done) {
          return store1.where("position >= [1,1]").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]<b<[x2,y2]'", function(done) {
          return store1.where("[1,0] < position < [3,4]").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]<=b<[x2,y2]'", function(done) {
          return store1.where("[1,0] <= position < [3,4]").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]<b<=[x2,y2]'", function(done) {
          return store1.where("[1,0] < position <= [3,4]").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]<=a<=[x2,y2]'", function(done) {
          return store1.where("[0,0] <= position <= [1,1]").list(function(items) {
            expect(items.length).toBe(4);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]>b>[x2,y2]'", function(done) {
          return store1.where("[3,4] > position > [1,1]").count(function(result) {
            expect(result).toBe(1);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]>=b>[x2,y2]'", function(done) {
          return store1.where("[3,4] >= position > [1,1]").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]>b>=[x2,y2]'", function(done) {
          return store1.where("[3,4] > position >= [1,1]").count(function(result) {
            expect(result).toBe(2);
            return done();
          })["catch"](done.fail);
        });
        it("can query compound index using '[x1,y1]>=b>=[x2,y2]'", function(done) {
          return store1.where("[3,4] >= position >= [1,1]").count(function(result) {
            expect(result).toBe(3);
            return done();
          })["catch"](done.fail);
        });
        return it("can query multi-entry using 'a=b'", function(done) {
          return store1.where("tags = html").list(function(items) {
            expect(items.length).toBe(4);
            return done();
          })["catch"](done.fail);
        });
      });
      describe("upgrade IDB('db2') to version 2", function() {
        beforeAll(function() {
          return db2.version(2, {
            "store1": ["KEY AUTO", "pos_x", "pos_y", "position(pos_x, pos_y)"]
          });
        });
        return it("should has version number 2", function(done) {
          return db2.version().then(function(dbVersion) {
            expect(dbVersion).toBe(2);
            return done();
          })["catch"](done.fail);
        });
      });
      return describe("IDB('db2').store('store1')", function() {
        var store1;
        store1 = null;
        beforeAll(function() {
          return store1 = db2.store('store1');
        });
        it("should have new index collection", function(done) {
          return store1.indexes().then(function(indexNameList) {
            expect(indexNameList).toContain('pos_x');
            expect(indexNameList).toContain('pos_y');
            expect(indexNameList).toContain('position');
            expect(indexNameList).not.toContain('tags');
            return done();
          })["catch"](done.fail);
        });
        it("can access newly added index", function(done) {
          return store1.where("pos_x = 2").list(function(items) {
            expect(items.length).toBe(1);
            return done();
          })["catch"](done.fail);
        });
        it("should not able to access removed index", function(done) {
          return store1.where("tags = html").list(function(items) {
            return done.fail("index:tags not yet removed as expected.");
          })["catch"](function(err) {
            expect(err.name).toBe("NotFoundError");
            return done();
          });
        });
        return it("can now add duplicated data to the index with 'UNIQUE' feature removed", function(done) {
          return store1.add({
            pos_x: 0,
            pos_y: 0,
            tags: ["html"]
          }).then(function() {
            return store1.where("position = [0,0]").list(function(items) {
              expect(items.length).toBe(2);
              return done();
            });
          })["catch"](done.fail);
        });
      });
    });
    return afterAll(function() {
      indexedDB.deleteDatabase("db1");
      return indexedDB.deleteDatabase("db2");
    });
  });

}).call(this);
