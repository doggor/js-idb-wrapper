(function() {
  var Database, DatabaseManager, IDBError, IDBKeyRange, IDBRequest2Q, IDBTransaction, IDBTx2Q, Query, Schema, Store, StoreManager, env, indexedDB, newDefer, newPromise, otherLib, toPromise,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  env = window || self || global || this;


  /*
  This code will constructs 3 Promise-related functions:
  
  1. newDefer()
     this function will return a new deferred object.
     A defferred object contains 2 functions:
     i.  resolve(result)
         return result value through calling this function.
     ii. reject(error)
         return any error through calling this function.
  
  2. toPromise(deferred)
     this function will return the promise object of given deferred object.
     A promise object contains 2 functions:
     i.  then(onSuccess, onError = null)
         set the result handler and, optionally, the error handler of the deferred object.
     ii. catch(onError)
         set the error handler of the deferred object.
  
  3. newPromise(result = null, error = null)
     A shortcut function of using both newDefer() and toPromise().
     It return a promise object that immediately resolve with given result
     or reject with given error. Thus, either result or error must be given.
   */

  if (typeof env.Promise !== "undefined") {
    newDefer = function() {
      var promiseObj;
      promiseObj = {};
      promiseObj.promise = new Promise(function(promiseResolve, promiseReject) {
        promiseObj.resolve = promiseResolve;
        return promiseObj.reject = promiseReject;
      });
      return promiseObj;
    };
    toPromise = function(deferred) {
      return deferred.promise;
    };
  } else if (typeof env.Q !== "undefined") {
    newDefer = function() {
      return Q.defer();
    };
    toPromise = function(deferred) {
      return deferred.promise;
    };
  } else if (typeof env.jQuery !== "undefined") {
    newDefer = function() {
      return jQuery.Deferred();
    };
    toPromise = function(deferred) {
      return deferred.promise({
        "catch": function(fn) {
          return this.fail(fn);
        }
      });
    };
  } else {
    throw new IDBError("No compatible promise function found.");
  }

  newPromise = function(result, error) {
    var d;
    d = newDefer();
    if (result) {
      d.resolve(result);
    } else if (error) {
      d.reject(error);
    } else {
      throw new Error("either result or error must provided to newPromise().");
    }
    return toPromise(d);
  };

  indexedDB = env.indexedDB || env.mozIndexedDB || env.webkitIndexedDB || env.msIndexedDB;

  IDBTransaction = env.IDBTransaction || env.webkitIDBTransaction || env.msIDBTransaction;

  IDBKeyRange = env.IDBKeyRange || env.webkitIDBKeyRange || env.msIDBKeyRange;

  IDBRequest2Q = function(request) {
    var deferred;
    deferred = newDefer();
    request.onsuccess = function(event) {
      return deferred.resolve(event);
    };
    request.onerror = function(event) {
      return deferred.reject(event);
    };
    return toPromise(deferred);
  };

  IDBTx2Q = function(tx) {
    var d;
    d = newDefer();
    tx.oncomplete = function(event) {
      return d.resolve(event);
    };
    tx.onerror = tx.onabort = function(event) {
      return d.reject(event);
    };
    return toPromise(d);
  };

  IDBError = (function(superClass) {
    extend(IDBError, superClass);

    function IDBError(message) {
      this.message = message;
      console.error("IDBError: " + this.message);
    }

    return IDBError;

  })(Error);

  Schema = (function() {
    var extract2KeyPath;

    Schema.Store = (function() {
      function Store(name1) {
        this.name = name1;
        this.option = {
          keyPath: null,
          autoIncrement: null
        };
        this.indexes = {};
      }

      Store.prototype.addIndex = function(name, key, isUnique, isMultiEntry) {
        if (this.indexes.hasOwnProperty(name)) {
          throw new IDBError("index(" + name + ") duplicated at ObjectStore(" + this.name + ").");
        } else {
          this.indexes[name] = {
            name: name,
            key: key,
            option: {
              unique: isUnique,
              multiEntry: isMultiEntry
            }
          };
        }
      };

      return Store;

    })();

    function Schema(dbDefinition) {
      this.stores = {};
      this.applyDefinition(dbDefinition);
    }

    Schema.prototype.applyDefinition = function(dbDefinition) {
      var dfn, i, indexName, isMultiEntry, isUnique, keyPath, len, matcher, results1, store, storeDfn, storeName;
      if (typeof dbDefinition !== "object") {
        throw new IDBError("The database definition must be JSON.");
      }
      results1 = [];
      for (storeName in dbDefinition) {
        storeDfn = dbDefinition[storeName];
        if (typeof storeName !== "string") {
          throw new IDBError("Store name must be string.");
          break;
        } else if (typeof storeDfn !== "object" || !(storeDfn instanceof Array)) {
          throw new IDBError("The definition of store(" + storeName + ") must be in array.");
          break;
        } else {
          store = new this.constructor.Store(storeName);
          for (i = 0, len = storeDfn.length; i < len; i++) {
            dfn = storeDfn[i];
            if (typeof dfn !== "string") {
              throw new IDBError("Index definition must be in string form.");
              break;
            } else {
              dfn = dfn.trim().replace(/[\s\t]+/g, " ").replace(/\s?\(\s?/g, "(").replace(/\s?\)\s?/g, ")").replace(/\s?\.\s?/g, ".");
              if (dfn.match(/^KEY/)) {
                if (store.option.keyPath != null) {
                  throw new IDBError("Store key duplicated.");
                }
                if (matcher = dfn.match(/^KEY(\(.+\)).*$/)) {
                  store.option.keyPath = extract2KeyPath(matcher[1]);
                }
                if (dfn.match(/AUTO$/)) {
                  store.option.autoIncrement = true;
                }
              } else {
                indexName = dfn.replace(/[\(\s].+/, "");
                if (!indexName.match(/(\w|\.)+/)) {
                  throw new IDBError("Invalid index name(" + indexName + ").");
                }
                isUnique = dfn.match(/[\s\)]UNIQUE/g) ? true : false;
                isMultiEntry = dfn.match(/[\s\)]ARRAY/g) ? true : false;
                keyPath = (matcher = dfn.match(/.+(\(.+\)).*/)) ? extract2KeyPath(matcher[1]) : indexName;
                store.addIndex(indexName, keyPath, isUnique, isMultiEntry);
              }
            }
          }
          results1.push(this.stores[storeName] = store);
        }
      }
      return results1;
    };

    extract2KeyPath = function(string) {
      var arr, itemStrings, key, opening;
      if ((opening = string.indexOf("(")) > -1) {
        string = string.slice(opening + 1, string.lastIndexOf(")"));
        if (itemStrings = string.match(/[^,]+/g)) {
          arr = (function() {
            var i, len, results1;
            results1 = [];
            for (i = 0, len = itemStrings.length; i < len; i++) {
              key = itemStrings[i];
              results1.push(extract2KeyPath(key.trim()));
            }
            return results1;
          })();
          if (arr.length === 1) {
            return arr[0];
          } else {
            return arr;
          }
        } else {
          return string;
        }
      } else {
        return string;
      }
    };

    return Schema;

  })();

  Query = (function() {
    function Query(store, indexName, range) {
      this._store = store;
      this._indexName = indexName;
      this._range = range;
      this._limitTo = null;
      this._limitFrom = 0;
      this._order = "next";
    }

    Query.prototype.getIDBIndexIfSet = function(idbStore) {
      if (this._indexName !== null) {
        return idbStore.index(this._indexName);
      } else {
        return idbStore;
      }
    };

    Query.prototype.order = function(direction) {
      this._order = direction === -1 || (typeof direction === "string" && direction.match(/desc/i)) ? "prev" : "next";
      return this;
    };

    Query.prototype.limit = function() {
      var args, from, length, ref;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      ref = (function() {
        switch (args.length) {
          case 1:
            length = args[0];
            if (typeof length !== "number" || length < 1) {
              throw new IDBError("length must be > 0 for Query.limit()");
            }
            return [0, length - 1];
          case 2:
            from = args[0];
            length = args[1];
            if (typeof from !== "number" || from < 0) {
              throw new IDBError("starting position must be > -1 for Query.limit()");
            }
            if (typeof length !== "number" || length < 1) {
              throw new IDBError("length must be > 0 for Query.limit()");
            }
            return [from, from + length - 1];
          default:
            throw new IDBError("wrong usage of Query.limit()");
        }
      })(), this._limitFrom = ref[0], this._limitTo = ref[1];
      return this;
    };

    Query.prototype.each = function(func) {
      return this._store.getIDBObjectStore("readonly").then((function(_this) {
        return function(idbStore) {
          var cursorPosition, d, results;
          d = newDefer();
          cursorPosition = 0;
          results = [];
          _this.getIDBIndexIfSet(idbStore).openCursor(_this._range, _this._order).onsuccess = function(event) {
            var cursor, err, result;
            if (cursor = event.target.result) {
              if (cursorPosition < _this._limitFrom) {
                return cursor.advance(cursorPosition = _this._limitFrom);
              } else if (_this._limitTo !== null && cursorPosition > _this._limitTo) {
                return d.resolve(results);
              } else {
                try {
                  result = func(cursor.value, cursor.key);
                  if (result !== void 0) {
                    results.push(result);
                  }
                  cursorPosition++;
                  return cursor["continue"]();
                } catch (_error) {
                  err = _error;
                  return d.reject(err);
                }
              }
            } else {
              return d.resolve(results);
            }
          };
          return toPromise(d);
        };
      })(this));
    };

    Query.prototype.first = function(func) {
      return this.limit(1).each(function(object, key) {
        return [object, key];
      }).then(function(data) {
        if (data.length > 0) {
          return func(data[0][0], data[0][1]);
        } else {
          return func(null, null);
        }
      });
    };

    Query.prototype.list = function(func) {
      var keys, objects;
      objects = [];
      keys = [];
      return this.each(function(object, key) {
        objects.push(object);
        return keys.push(key);
      }).then(function() {
        return func(objects, keys);
      });
    };

    Query.prototype.count = function(func) {
      return this._store.getIDBObjectStore("readonly").then((function(_this) {
        return function(idbStore) {
          return IDBRequest2Q(_this.getIDBIndexIfSet(idbStore).count(_this._range));
        };
      })(this)).then(function(event) {
        return func(event.target.result);
      });
    };

    return Query;

  })();

  Store = (function() {
    var extractStr;

    function Store(storeName, db) {
      this._name = storeName;
      this._db = db;
    }

    Store.prototype.getIDBObjectStore = function(mode) {
      if (mode == null) {
        mode = "readwrite";
      }
      return this._db.getIDBTransaction(this._name, mode).then((function(_this) {
        return function(tx) {
          return tx.objectStore(_this._name);
        };
      })(this));
    };

    Store.prototype.key = function(cb) {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return cb(idbStore.keyPath);
      });
    };

    Store.prototype.name = function(cb) {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return cb(idbStore.name);
      });
    };

    Store.prototype.indexes = function(cb) {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return cb(idbStore.indexNames);
      });
    };

    Store.prototype.isAutoKey = function(cb) {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return cb(idbStore.autoIncrement);
      });
    };

    Store.prototype.add = function() {
      var arg;
      arg = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.getIDBObjectStore().then(function(idbStore) {
        return IDBRequest2Q(idbStore.add.apply(idbStore, arg));
      });
    };

    Store.prototype.update = function() {
      var arg;
      arg = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return this.getIDBObjectStore().then(function(idbStore) {
        return IDBRequest2Q(idbStore.put.apply(idbStore, arg));
      });
    };

    Store.prototype["delete"] = function(key) {
      return this.getIDBObjectStore().then(function(idbStore) {
        return IDBRequest2Q(idbStore["delete"](key));
      });
    };

    Store.prototype.clear = function() {
      return this.getIDBObjectStore().then(function(idbStore) {
        return IDBRequest2Q(idbStore.clear());
      });
    };

    Store.prototype.where = function(expression) {
      var indexName, matcher, range, ref;
      if (typeof expression === "string") {
        expression = expression.trim();
      }
      ref = (function() {
        switch (false) {
          case !(expression === null || expression === ""):
            return [null, null];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[1]), extractStr(matcher[3]))];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[1]), extractStr(matcher[3]), true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[1]), extractStr(matcher[3]), false, true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[1]), extractStr(matcher[3]), true, true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[3]), extractStr(matcher[1]))];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[3]), extractStr(matcher[1]), true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[3]), extractStr(matcher[1]), false, true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[2]), IDBKeyRange.bound(extractStr(matcher[3]), extractStr(matcher[1]), true, true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*<=[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[1]), IDBKeyRange.upperBound(extractStr(matcher[2]))];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*<[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[1]), IDBKeyRange.upperBound(extractStr(matcher[2]), true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*>=[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[1]), IDBKeyRange.lowerBound(extractStr(matcher[2]))];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*>[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[1]), IDBKeyRange.lowerBound(extractStr(matcher[2]), true)];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*=[\s\t]*('.*'|".*"|\[.*\]|[^\s\t]+)$/)):
            return [extractStr(matcher[1]), IDBKeyRange.only(extractStr(matcher[2]))];
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[1]), null];
          default:
            throw new IDBError("Unknown statment (" + expression + ").");
        }
      })(), indexName = ref[0], range = ref[1];
      return new Query(this, indexName, range);
    };

    Store.prototype.all = function() {
      return this.where(null);
    };

    extractStr = function(string) {
      var i, len, ref, results1, str;
      if (string.match(/^\[.*\]$/)) {
        ref = string.slice(1, -1).match(/(\[.+\]|'.*'|".*"|[^,]+)/g);
        results1 = [];
        for (i = 0, len = ref.length; i < len; i++) {
          str = ref[i];
          results1.push(extractStr(str.trim()));
        }
        return results1;
      } else if (!isNaN(string)) {
        return +string;
      } else {
        if (string.match(/^('.*'|".*")$/)) {
          return string.slice(1, -1);
        } else {
          return string;
        }
      }
    };

    return Store;

  })();

  Database = (function() {
    function Database(dbName) {
      this._name = dbName;
      this._version = null;
      this._dbDefinition = null;
      this._idbDatabase = null;
      this._batchTx = null;
      this._onVersionConflictHandler = function(event) {
        throw event;
      };
    }

    Database.prototype.name = function(cb) {
      return this.getIDBDatabase().then(function(idb) {
        return cb(idb.name);
      });
    };

    Database.prototype.version = function() {
      var args, cb, dbDefination, versionNumber;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      if (args.length === 1) {
        cb = args[0];
        return this.getIDBDatabase().then(function(idb) {
          return cb(idb.version);
        });
      } else if (args.length === 2) {
        versionNumber = args[0];
        dbDefination = args[1];
        if (this._version === null || this._version <= versionNumber) {
          this._dbDefinition = dbDefination;
          this._version = versionNumber;
          if (this._idbDatabase !== null) {
            this._idbDatabase.close();
            this._idbDatabase = this._batchTx = null;
          }
          return this;
        }
      }
    };

    Database.prototype.onVersionConflict = function(handler) {
      this._onVersionConflictHandler = handler;
      return this;
    };

    Database.prototype.getIDBDatabase = function() {
      var r;
      if (this._idbDatabase != null) {
        return newPromise(this._idbDatabase);
      } else {
        r = indexedDB.open(this._name, this._version);
        r.onupgradeneeded = (function(_this) {
          return function(event) {
            return _this.doUpgrade(event.target.result, event.target.transaction);
          };
        })(this);
        r.onblocked = (function(_this) {
          return function(event) {
            if (event.newVersion === _this._version) {

            } else {
              if (typeof _this._onVersionConflictHandler === "function") {
                return _this._onVersionConflictHandler(event);
              }
            }
          };
        })(this);
        return IDBRequest2Q(r).then((function(_this) {
          return function(event) {
            return _this._idbDatabase = event.target.result;
          };
        })(this));
      }
    };

    Database.prototype.getIDBTransaction = function(storeNames, mode) {
      if (this._batchTx) {
        return newPromise(this._batchTx);
      } else {
        return this.getIDBDatabase().then(function(idb) {
          return idb.transaction(storeNames, mode);
        });
      }
    };

    Database.prototype.store = function(storeName) {
      return StoreManager(storeName, this);
    };

    Database.prototype.close = function() {
      this._idbDatabase.close();
      return this._idbDatabase = this._batchTx = null;
    };

    Database.prototype.remove = function() {
      var deferred, r;
      r = indexedDB.deleteDatabase(this._name);
      deferred = newDefer();
      r.onblocked = deferred.resolve;
      r.onerror = deferred.reject;
      r.onsuccess = deferred.resolve;
      return (toPromise(deferred)).then((function(_this) {
        return function() {
          return _this._name = _this._version = _this._dbDefinition = _this._onVersionConflictHandler = _this._idbDatabase = _this._batchTx = null;
        };
      })(this));
    };

    Database.prototype.batch = function() {
      var batchFunc, i, storeNames;
      storeNames = 2 <= arguments.length ? slice.call(arguments, 0, i = arguments.length - 1) : (i = 0, []), batchFunc = arguments[i++];
      this._batchTx = null;
      return this.getIDBTransaction(storeNames, "readwrite").then((function(_this) {
        return function(tx) {
          var storeName;
          _this._batchTx = tx;
          try {
            batchFunc.apply(null, (function() {
              var j, len, results1;
              results1 = [];
              for (j = 0, len = storeNames.length; j < len; j++) {
                storeName = storeNames[j];
                results1.push(this.store(storeName));
              }
              return results1;
            }).call(_this));
          } finally {
            _this._batchTx = null;
          }
          return IDBTx2Q(tx);
        };
      })(this));
    };

    Database.prototype.doUpgrade = function(idb, tx) {
      var _schema, action, actions, currentStoreNames, fn1, fn2, i, indexName, indexSchema, j, len, len1, ref, ref1, results1, store, storeName, storeSchema;
      if (this._dbDefinition === null) {
        throw new IDBError("DB definition not found.");
      }
      _schema = new Schema(this._dbDefinition);
      actions = [];
      currentStoreNames = idb.objectStoreNames;
      fn1 = function(storeName) {
        var currentIndexNames, fn2, indexName, indexSchema, j, len1, ref, results1, store, storeSchema;
        if (_schema.stores.hasOwnProperty(storeName)) {
          store = tx.objectStore(storeName);
          currentIndexNames = store.indexNames;
          storeSchema = _schema.stores[storeName];
          fn2 = function(indexName) {
            var index, indexSchema;
            if (storeSchema.indexes.hasOwnProperty(indexName)) {
              index = store.index(indexName);
              indexSchema = storeSchema.indexes[indexName];
              if (!index.unique && indexSchema.option.unique) {
                throw new IDBError("Turning existed index(" + indexName + ") to be unique is not allowed.");
              }
              if (index.keyPath !== indexSchema.key || index.unique !== indexSchema.option.unique || index.multiEntry !== indexSchema.option.multiEntry) {
                actions.push(function() {
                  return store.deleteIndex(indexName);
                });
                return actions.push(function() {
                  return store.createIndex(indexName, indexSchema.key, indexSchema.option);
                });
              }
            } else {
              return actions.push(function() {
                return store.deleteIndex(indexName);
              });
            }
          };
          for (j = 0, len1 = currentIndexNames.length; j < len1; j++) {
            indexName = currentIndexNames[j];
            fn2(indexName);
          }
          ref = storeSchema.indexes;
          results1 = [];
          for (indexName in ref) {
            indexSchema = ref[indexName];
            if (indexOf.call(currentIndexNames, indexName) < 0) {
              results1.push((function(store, indexName, indexSchema) {
                return actions.push(function() {
                  return store.createIndex(indexName, indexSchema.key, indexSchema.option);
                });
              })(store, indexName, indexSchema));
            }
          }
          return results1;
        } else {
          return actions.push(function() {
            return idb.deleteObjectStore(storeName);
          });
        }
      };
      for (i = 0, len = currentStoreNames.length; i < len; i++) {
        storeName = currentStoreNames[i];
        fn1(storeName);
      }
      ref = _schema.stores;
      for (storeName in ref) {
        storeSchema = ref[storeName];
        if (!(indexOf.call(currentStoreNames, storeName) < 0)) {
          continue;
        }
        store = idb.createObjectStore(storeName, storeSchema.option);
        ref1 = storeSchema.indexes;
        fn2 = function(store, indexName, indexSchema) {
          return actions.push(function() {
            return store.createIndex(indexName, indexSchema.key, indexSchema.option);
          });
        };
        for (indexName in ref1) {
          indexSchema = ref1[indexName];
          fn2(store, indexName, indexSchema);
        }
      }
      results1 = [];
      for (j = 0, len1 = actions.length; j < len1; j++) {
        action = actions[j];
        results1.push(action());
      }
      return results1;
    };

    return Database;

  })();

  StoreManager = (function() {
    var stores;
    stores = {};
    return function(storeName, database) {
      var key;
      key = database._name + "." + storeName;
      if (!stores.hasOwnProperty(key)) {
        stores[key] = new Store(storeName, database);
      }
      return stores[key];
    };
  })();

  DatabaseManager = (function() {
    var accessor, dbs;
    dbs = {};
    accessor = function(dbName) {
      if (!dbs.hasOwnProperty(dbName)) {
        dbs[dbName] = new Database(dbName);
      }
      return dbs[dbName];
    };
    accessor.Error = IDBError;
    return accessor;
  })();

  if (typeof define === "function" && (define.amd != null)) {
    define('IDB', DatabaseManager);
  } else if ((typeof module !== "undefined" && module !== null ? module.exports : void 0) != null) {
    module.exports = DatabaseManager;
  } else {
    if (env.hasOwnProperty('IDB')) {
      otherLib = env['IDB'];
      env.IDB = DatabaseManager;
      env.IDB.noConflict = function() {
        return otherLib;
      };
    } else {
      env.IDB = DatabaseManager;
    }
  }

}).call(this);

//# sourceMappingURL=idb.js.map