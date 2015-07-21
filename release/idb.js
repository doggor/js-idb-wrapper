(function() {
  var Database, DatabaseManager, IDBError, IDBKeyRange, IDBRequest2Q, IDBTransaction, IDBTx2Q, Query, Schema, Store, env, indexedDB, msg, newDefer, newPromise, toPromise,
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
    throw new IDBError("Not compatible promise function found.");
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
    var d;
    d = newDefer();
    request.onsuccess = function(event) {
      return d.resolve(event);
    };
    request.onerror = function(event) {
      return d.reject(event);
    };
    return toPromise(d);
  };

  IDBTx2Q = function(tx) {
    var d;
    d = newDefer();
    tx.onComplete = function(event) {
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
    var index2KeyPath, string2KeyPath;

    Schema.prototype.stores = {};

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
      var dfn, i, indexName, isMultiEntry, isUnique, keyPath, len, store, storeDfn, storeName;
      if (typeof dbDefinition !== "object") {
        throw new IDBError("The database definition must be JSON.");
      }
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
              dfn = dfn.trim().replace(/(\s|\t)+/g, " ").replace(/\s?\(\s?/g, "(").replace(/\s?\)\s?/g, ")").replace(/\s?,\s?/g, ",").replace(/\s?\+\s?/g, "+").replace(/\s?\.\s?/g, ".");
              if (dfn.match(/^KEY/)) {
                if (store.option.keyPath != null) {
                  throw new IDBError("Store key duplicated.");
                }
                if (dfn.match(/^KEY\(.+\)/)) {
                  store.option.keyPath = string2KeyPath(dfn.slice(4, dfn.indexOf(")")));
                }
                if (dfn.match(/AUTO$/)) {
                  store.option.autoIncrement = true;
                }
              } else {
                indexName = dfn.replace(/\(.+\)/, "").replace(/( UNIQUE)$/, "");
                if (!indexName.match(/(\w|\.)+/)) {
                  throw new IDBError("Invalid index name(" + indexName + ").");
                }
                isUnique = dfn.match(/( UNIQUE)$/) ? true : false;
                isMultiEntry = false;
                keyPath = (function() {
                  if (dfn.match(/^.+\(.+\)/)) {
                    if (dfn.indexOf(",") > -1) {
                      isMultiEntry = true;
                    }
                    if (isMultiEntry && dfn.indexOf("+") > -1) {
                      throw new IDBError("Fail to parse definition(" + string + "): ',' and '+' cannot state in the same definition.");
                    }
                    return string2KeyPath(dfn.slice(dfn.indexOf("(") + 1, dfn.indexOf(")")));
                  } else {
                    return index2KeyPath(indexName);
                  }
                })();
                store.addIndex(indexName, keyPath, isUnique, isMultiEntry);
              }
            }
          }
          this.stores[storeName] = store;
        }
      }
    }

    string2KeyPath = function(string) {
      var i, j, keyPath, len, len1, ref, ref1, results, results1;
      if (string.indexOf(",") > -1) {
        ref = string.split(",");
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          keyPath = ref[i];
          results.push(string2KeyPath(keyPath));
        }
        return results;
      } else if (string.indexOf("+") > -1) {
        ref1 = string.split("+");
        results1 = [];
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          keyPath = ref1[j];
          results1.push(string2KeyPath(keyPath));
        }
        return results1;
      } else {
        if (string.indexOf(".") > -1) {
          string = string.replace(".", ",");
        }
        if (string.match(/^(\'\'|\"\")$/)) {
          return "";
        } else if (string.match(/(\'|\")/g)) {
          throw new IDBError("Fail to parse definition(" + string + "): quotation mark not in pairs.");
        } else {
          return string;
        }
      }
    };

    index2KeyPath = function(indexName) {
      if (indexName.indexOf(".") > -1) {
        return indexName.split(".");
      } else {
        return indexName;
      }
    };

    return Schema;

  })();

  Query = (function() {
    var _indexName, _order, _range, _store, getIDBIndexIfSet;

    _store = _indexName = _range = null;

    _order = "next";

    function Query(store, indexName, range) {
      _store = store;
      _indexName = indexName;
      _range = range;
    }

    Query.prototype.order = function(direction) {
      if (direction === -1 || (typeof direction === "string" && direction.match(/desc/))) {
        _order = "prev";
      } else {
        _order = "next";
      }
      return this;
    };

    Query.prototype.each = function(func) {
      return _store.getIDBObjectStore("readonly").then(function(idbStore) {
        var cursorRequest, d;
        d = newDefer();
        cursorRequest = (getIDBIndexIfSet(idbStore)).openCursor(_range, _order);
        cursorRequest.onsuccess = function(event) {
          var cursor, err;
          if (cursor = event.target.result) {
            try {
              func(cursor.value, cursor.key);
              return cursor["continue"]();
            } catch (_error) {
              err = _error;
              return d.reject(err);
            }
          } else {
            return d.resolve();
          }
        };
        return toPromise(d);
      });
    };

    Query.prototype.first = function(func) {
      return _store.getIDBObjectStore("readonly").then(function(idbStore) {
        return IDBRequest2Q((getIDBIndexIfSet(idbStore)).get(_range));
      }).then(function(event) {
        return func(event.target.result);
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
      return _store.getIDBObjectStore("readonly").then(function(idbStore) {
        return IDBRequest2Q((getIDBIndexIfSet(idbStore)).count(_range));
      }).then(function(event) {
        return func(event.target.result);
      });
    };

    getIDBIndexIfSet = function(idbStore) {
      if (_indexName) {
        return idbStore.index(_indexName);
      } else {
        return idbStore;
      }
    };

    return Query;

  })();

  Store = (function() {
    var _db, _name, extractStr;

    _name = _db = null;

    function Store(storeName, db) {
      _name = storeName;
      _db = db;
    }

    Store.prototype.getIDBObjectStore = function(mode) {
      if (mode == null) {
        mode = "readwrite";
      }
      return _db.getIDBTransaction(_name, mode).then(function(tx) {
        return tx.objectStore(_name);
      });
    };

    Store.prototype.key = function() {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return idbStore.keyPath;
      });
    };

    Store.prototype.name = function() {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return idbStore.name;
      });
    };

    Store.prototype.indexes = function() {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return idbStore.indexNames;
      });
    };

    Store.prototype.isAutoKey = function() {
      return this.getIDBObjectStore("readonly").then(function(idbStore) {
        return idbStore.autoIncrement;
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
          case !(matcher = expression.match(/^('.*'|".*"|[^\s\t]+)[\s\t]*=[\s\t]*('.*'|".*"|[^\s\t]+)$/)):
            return [extractStr(matcher[1]), IDBKeyRange.only(extractStr(matcher[2]))];
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
      var i, len, ref, results, str;
      if (string.match(/^\[.*\]$/)) {
        ref = string.slice(1, -1).match(/(\[.+\]|'.*'|".*"|[^,]+)/g);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          str = ref[i];
          results.push(extractStr(str.trim()));
        }
        return results;
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
    var _batchTx, _idbDatabase, _name, _onVersionConflictHandler, _schema, _version, doUpgrade;

    _name = _version = _schema = _onVersionConflictHandler = _idbDatabase = _batchTx = null;

    function Database(dbName) {
      _name = dbName;
    }

    Database.prototype.name = function() {
      return this.getIDBDatabase().then(function(idb) {
        return idb.name;
      });
    };

    Database.prototype.version = function(versionNumber, dbDefination) {
      if (!versionNumber) {
        return this.getIDBDatabase().then(function(idb) {
          return idb.version;
        });
      } else if (_version === null || _version <= versionNumber) {
        _schema = new Schema(dbDefination);
        return _version = versionNumber;
      }
    };

    Database.prototype.onVersionConflict = function(handler) {
      return _onVersionConflictHandler = handler;
    };

    Database.prototype.getIDBDatabase = function() {
      var r;
      if (_idbDatabase != null) {
        return newPromise(_idbDatabase);
      } else {
        r = indexedDB.open(_name, _version);
        r.onblocked = _onVersionConflictHandler;
        r.onupgradeneeded = function(event) {
          return doUpgrade(event.target.result);
        };
        return IDBRequest2Q(r).then(function(event) {
          return _idbDatabase = event.target.result;
        });
      }
    };

    Database.prototype.getIDBTransaction = function(storeNames, mode) {
      if (_batchTx) {
        return newPromise(_batchTx);
      } else {
        return this.getIDBDatabase().then(function(idb) {
          return idb.transaction(storeNames, mode);
        });
      }
    };

    Database.prototype.store = function(storeName) {
      return new Store(storeName, this);
    };

    Database.prototype.remove = function() {
      return IDBRequest2Q(indexDB.deleteDatabase(_name)).then(function() {
        return _name = _version = _schema = _onVersionConflictHandler = _idbDatabase = _batchTx = null;
      });
    };

    Database.prototype.batch = function() {
      var batchFunc, storeNames;
      storeNames = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      _batchTx = null;
      batchFunc = null;
      this.getIDBTransaction(storeNames, "readonly").then(function(tx) {
        _batchTx = tx;
        if (batchFunc !== null) {
          return batchFunc();
        }
      });
      return {
        run: (function(_this) {
          return function(func) {
            batchFunc = function() {
              try {
                return func(_this);
              } finally {
                batchFunc = null;
                _batchTx = null;
              }
            };
            if (_batchTx !== null) {
              batchFunc();
            }
            return IDBTx2Q(_batchTx);
          };
        })(this)
      };
    };

    doUpgrade = function(idb) {
      var action, actions, currentStoreNames, fn1, fn2, i, indexName, indexSchema, j, len, len1, ref, ref1, results, store, storeName, storeSchema, tx;
      if (_schema === null) {
        throw new IDBError("Schema not found.");
      }
      actions = [];
      currentStoreNames = idb.objectStoreNames;
      if (currentStoreNames.length > 0) {
        tx = idb.transaction(currentStoreNames, "readwrite");
        fn1 = function(storeName) {
          var currentIndexNames, indexName, j, len1, results, store, storeSchema;
          if (_schema.stores.hasOwnProperty(storeName)) {
            store = tx.objectStore(storeName);
            currentIndexNames = store.indexNames;
            storeSchema = _schema.stores[storeName];
            results = [];
            for (j = 0, len1 = currentIndexNames.length; j < len1; j++) {
              indexName = currentIndexNames[j];
              results.push((function(indexName) {
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
              })(indexName));
            }
            return results;
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
      results = [];
      for (j = 0, len1 = actions.length; j < len1; j++) {
        action = actions[j];
        results.push(action());
      }
      return results;
    };

    return Database;

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
    if (!this.hasOwnProperty('IDB')) {
      this.IDB = DatabaseManager;
    } else if (!this.hasOwnProperty('$IDB')) {
      this.$IDB = DatabaseManager;
    } else {
      msg = "Fail to export IDB: name 'IDB' and '$IDB' is in use.";
      if (typeof (typeof console !== "undefined" && console !== null ? console.error : void 0) === "function") {
        console.error(msg);
      } else {
        throw msg;
      }
    }
  }

}).call(this);

//# sourceMappingURL=idb.js.map