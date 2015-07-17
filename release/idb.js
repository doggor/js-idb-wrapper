(function() {
  var Database, DatabaseManager, IDBError, IDBKeyRange, IDBRequest2Q, IDBTransaction, IDBTx2Q, Query, Schema, Store, env, indexedDB, msg, newDefer, toPromise,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  env = window || self || global || this;

  if (typeof env.Promise !== "undefined") {
    newDefer = function() {
      return new Promise;
    };
    toPromise = function(deferred) {
      return deferred;
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
        if (this.indexes[name]) {
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
      for (storeName in dbDefinition) {
        storeDfn = dbDefinition[storeName];
        if (typeof storeName !== "string") {
          throw new IDBError("Store name must be string.");
          break;
        } else if (typeof storeDfn !== "object" || !(storeDfn instanceof Array)) {
          throw new IDBError("The definition of store(" + storeName + ") must be in array.");
          break;
        } else {
          store = new this.Store(storeName);
          for (i = 0, len = storeDfn.length; i < len; i++) {
            dfn = storeDfn[i];
            if (typeof dfn !== "string") {
              throw new IDBError("Index definition must be in string form.");
              break;
            } else {
              dfn = dfn.trim().replace(/(\s|\t)+/g, " ").replace(/\s?\(\s?/g, "(").replace(/\s?\)\s?/g, ")").replace(/\s?,\s?/g, ",").replace(/\s?.\s?/g, ".");
              if (dfn.match(/^KEY/)) {
                if (store.option.keyPath != null) {
                  throw new IDBError("Store key duplicated.");
                } else if (dfn.match(/^KEY\(.+\)/)) {
                  store.option.keyPath = string2KeyPath(dfn.slice(4, dfn.indexOf(")")));
                }
                if (dfn.match(/( AUTO)$/)) {
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
      var i, keyPath, len, ref, results;
      if (string.search(/(,|\+)/) > -1) {
        ref = string.split(/(,|\+)/);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          keyPath = ref[i];
          results.push(string2KeyPath(keyPath));
        }
        return results;
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
    var _indexName, _order, _range, _store;

    _store = _indexName = _range = _order = null;

    function Query(store, indexName, range) {
      _store = store;
      _indexName = indexName != null ? indexName : store.key();
      _range = range;
    }

    Query.prototype.order = function(direction) {
      if (direction === -1 || (typeof direction === "string" && direction.match(/desc/))) {
        _order = "prev";
      } else {
        _order = null;
      }
      return this;
    };

    Query.prototype.each = function(func) {
      var d, index, r;
      d = newDefer();
      index = _store.getIDBObjectStore("readonly").index(_indexName);
      r = index.openCursor(range, _order);
      r.onsuccess = function(event) {
        var cursor, err;
        if (cursor = event.target.result) {
          try {
            if (func(cursor.key, cursor.value, event) === false) {
              return d.resolve(event);
            } else {
              return cursor["continue"]();
            }
          } catch (_error) {
            err = _error;
            return d.reject(err);
          }
        } else {
          return d.resolve(event);
        }
      };
      r.onerror = function(event) {
        return d.reject(event);
      };
      return toPromise(d);
    };

    Query.prototype.first = function(func) {
      var index;
      index = _store.getIDBObjectStore("readonly").index(_indexName);
      return IDBRequest2Q(index.get(range)).then(function(event) {
        return func(event.target.result);
      });
    };

    Query.prototype.list = function(func) {
      var result;
      result = [];
      return this.each(function(value) {
        return result.push(value);
      }).then(func(result));
    };

    Query.prototype.count = function(func) {
      var index;
      index = _store.getIDBObjectStore("readonly").index(_indexName);
      return IDBRequest2Q(index.count(_range)).then(function(event) {
        return func(event.target.result);
      });
    };

    return Query;

  })();

  Store = (function() {
    var _db, _name, getIDBObjectStore, string2Range;

    function Store() {}

    _name = _db = {
      constructor: function(storeName, db) {
        _name = storeName;
        return _db = db;
      }
    };

    getIDBObjectStore = function(mode) {
      if (mode == null) {
        mode = "readwrite";
      }
      return _db.getIDBTransaction(_name, mode).then(function(tx) {
        return tx.objectStore(_name);
      });
    };

    Store.prototype.key = function() {
      return this.getIDBObjectStore("readonly").keyPath;
    };

    Store.prototype.name = function() {
      return _name;
    };

    Store.prototype.indexes = function() {
      return this.getIDBObjectStore("readonly").indexNames;
    };

    Store.prototype.isAutoIncrement = function() {
      return this.getIDBObjectStore("readonly").autoIncrement;
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
      var exp, indexName, lower, range, ref, ref1, ref10, ref11, ref12, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, upper;
      exp = expression.trim().replace(/(\s|\t)+/g, "");
      switch (false) {
        case !exp.match(/^.+=.+$/):
          ref = exp.split("="), indexName = ref[0], range = ref[1];
          range = IDBKeyRange.only(string2Range(range));
          break;
        case !exp.match(/^.+<.+$/):
          ref1 = exp.split("<"), indexName = ref1[0], range = ref1[1];
          range = IDBKeyRange.upperBound(string2Range(range, true));
          break;
        case !exp.match(/^.+<=.+$/):
          ref2 = exp.split("<="), indexName = ref2[0], range = ref2[1];
          range = IDBKeyRange.upperBound(string2Range(range));
          break;
        case !exp.match(/^.+>.+$/):
          ref3 = exp.split(">"), indexName = ref3[0], range = ref3[1];
          range = IDBKeyRange.lowerBound(string2Range(range, true));
          break;
        case !exp.match(/^.+>=.+$/):
          ref4 = exp.split(">="), indexName = ref4[0], range = ref4[1];
          range = IDBKeyRange.lowerBound(string2Range(range));
          break;
        case !exp.match(/^.+<.+<.+$/):
          ref5 = exp.split("<"), lower = ref5[0], indexName = ref5[1], upper = ref5[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper, true, true)));
          break;
        case !exp.match(/^.+<=.+<.+$/):
          ref6 = exp.split(/<\=?/), lower = ref6[0], indexName = ref6[1], upper = ref6[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper, false, true)));
          break;
        case !exp.match(/^.+<.+<=.+$/):
          ref7 = exp.split("<\=?"), lower = ref7[0], indexName = ref7[1], upper = ref7[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper, true)));
          break;
        case !exp.match(/^.+<=.+<=.+$/):
          ref8 = exp.split("<="), lower = ref8[0], indexName = ref8[1], upper = ref8[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper)));
          break;
        case !exp.match(/^.+>.+>.+$/):
          ref9 = exp.split(">"), upper = ref9[0], indexName = ref9[1], lower = ref9[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper, true, true)));
          break;
        case !exp.match(/^.+>=.+>.+$/):
          ref10 = exp.split(/>\=?/), upper = ref10[0], indexName = ref10[1], lower = ref10[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper, false, true)));
          break;
        case !exp.match(/^.+>.+>=.+$/):
          ref11 = exp.split(">\=?"), upper = ref11[0], indexName = ref11[1], lower = ref11[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper, true)));
          break;
        case !exp.match(/^.+>=.+>=.+$/):
          ref12 = exp.split(">="), upper = ref12[0], indexName = ref12[1], lower = ref12[2];
          range = IDBKeyRange.bound(string2Range(lower, string2Range(upper)));
          break;
        default:
          throw new IDBError("Unknown statment (" + expression + ").");
      }
      return new Query(this, indexName, range);
    };

    string2Range = function(string) {
      var i, len, ref, results, str;
      if (string.match(/^\[.*\]$/)) {
        ref = string.slice(1, -1).match(/(\[.+\]|'.+'|".+"|[^,]+)/g);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          str = ref[i];
          results.push(string2Range(str));
        }
        return results;
      } else if (!isNaN(string)) {
        return +string;
      } else {
        if (string.match(/^('|").+('|")$/)) {
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
      return _name;
    };

    Database.prototype.version = function(versionNumber, dbDefination) {
      if (!versionNumber) {
        return _version;
      } else if (_version === null || _version <= versionNumber) {
        return _schema = new Schema(dbDefination);
      }
    };

    Database.prototype.onVersionConflict = function(handler) {
      return _onVersionConflictHandler = handler;
    };

    Database.prototype.getIDBDatabase = function() {
      var r;
      if (_idbDatabase != null) {
        return toPromise(newDefer().resolve(_idbDatabase));
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
        return toPromise(newDefer().resolve(_batchTx));
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
      var action, actions, currentIndexNames, currentStoreNames, i, index, indexName, indexSchema, j, k, len, len1, len2, ref, results, store, storeName, storeSchema, tx;
      if (_schema !== null) {
        return;
      }
      actions = [];
      currentStoreNames = db.objectStoreNames;
      tx = db.transaction(currentStoreNames, "readwrite");
      for (i = 0, len = currentStoreNames.length; i < len; i++) {
        storeName = currentStoreNames[i];
        if (_schema.stores.hasOwnProperty(storeName)) {
          store = tx.objectStore(storeName);
          currentIndexNames = store.indexNames;
          storeSchema = _schema.stores[storeName];
          for (j = 0, len1 = currentIndexNames.length; j < len1; j++) {
            indexName = currentIndexNames[j];
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
                actions.push(function() {
                  return store.createIndex(indexName, indexSchema.key, indexSchema.option);
                });
              }
            } else {
              actions.push(function() {
                return store.deleteIndex(indexName);
              });
            }
          }
        } else {
          actions.push(function() {
            return db.deleteObjectStore(storeName);
          });
        }
      }
      ref = _schema.stores;
      for (storeName in ref) {
        storeSchema = ref[storeName];
        if (!(indexOf.call(currentStoreNames, storeName) < 0)) {
          continue;
        }
        store = db.createObjectStore(storeName, storeSchema.option);
        for (indexName in storeSchema) {
          indexSchema = storeSchema[indexName];
          actions.push(function() {
            return store.createIndex(indexName, indexSchema.key, indexSchema.option);
          });
        }
      }
      results = [];
      for (k = 0, len2 = actions.length; k < len2; k++) {
        action = actions[k];
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