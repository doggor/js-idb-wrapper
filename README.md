# js-idb-wrapper
This wrapper is aimed to simplify the use of indexedDB and is designed as lazy as it can: all databases and object stores will not be created, upgraded or opened as long as no any explicit operations perform (read or write any stored data).


## Usage
Get a database reference:
```js
//get a reference of the indexedDB named "app_db"
db = IDB('app_db');
```

Define a database schema:
```js
IDB('app_db').version(1, {
    "users": [
        "KEY(id) AUTO",  //the keypath of the objects will be auto increased and assgin to the property "id"
        "name",  //the property named "idx1" will be well indexed
        "email UNIQUE" //the index will not allow duplicate values for a single key
    ],
    "locations": [
        "KEY AUTO",  //the key will be  auto increased but not assign into the objects
        "name",
        "pos.x",  //can index nested porperty
        "pos.y",
        "point(pos.x,pos.y)",  //compound index, where properties "x" and "y" can be found in the objects
        "tags ARRAY" //the index will add an entry in the index for each array element
    ]
});
```

You can upgrade the database by defining a larger version:
```js
IDB('app_db').version(1, {
    "store1": [
        "KEY AUTO",
        "idx1",
        "idx2 UNIQUE",
        "idx3 ARRAY"
}).version(2, {
    "store1", [
        "KEY AUTO",  //key can not make any change,
        "idx1 ARRAY",  //can re-index with "multi-entry" feature
        "idx2",  //can remove "unique" feature, but cannot add it back
        "idx3", //can re-index without "multi-entry" feature
});
//notice: the database will not upgrade util the first explicit operation perform.
```

Get database's name:
```js
IDB('app_db').name().then(function(dbName) {
    console.log(dbName); //the database's name
});
```

Get database's version:
```js
IDB('app_db').version().then(function(dbVersion) {
    console.log(dbVersion); //the database's version
});
```

Get a object store reference:
```js
//get a reference of the object store "users" inside the "app_db" indexedDB
users = IDB('app_db').store('users');
```

Get store's name:
```js
IDB('app_db').store('users').name().then(function(storeName) {
    console.log(storeName); //the store's name
});
```

Get store's keypath:
```js
IDB('app_db').store('users').key().then(function(keyPath) {
    console.log(keyPath); //the store's keypath
});
```

Get store's index names:
```js
IDB('app_db').store('users').indexes.then(function(indexNames) {
    for (var i in indexNames) { console.log(indexNames[i]); } //array of index names
});
```

Interact with store:
```js
users = IDB('app_db').store('users');

//add data
users.add({name: "Andy", email: "andy@mail.com"}).then(function() {
    //do something after data added
});

//update data with key(id) = 1
users.update({id: 1, name: "Ben", email: "ben@mail.com").then(function(){/*...*/});

//remove data with key = 1
users.delete(1).then(function(){/*...*/});

//remove all data
users.clear().then(function(){/*...*/});

```

Query store:
```js
locations = IDB('app_db').store('locations');

query01 = locations.where("name = China");
query02 = locations.where("name = 'Hong Kong'"); //use '...' if there are any spaces
query03 = locations.where("pos.x > 5");
query04 = locations.where("pos.x < 8");
query05 = locations.where("pos.x >= 4");
query06 = locations.where("pos.x <= 7");
query07 = locations.where("1 < pos.x < 9");
query08 = locations.where("2 <= pos.x < 9");
query09 = locations.where("1 < pos.x <= 8");
query10 = locations.where("2 <= pos.x <= 8");
query11 = locations.where("9 > pos.x > 1");
query12 = locations.where("8 => pos.x > 1");
query13 = locations.where("9 > pos.x => 2");
query14 = locations.where("8 => pos.x => 2");
query15 = locations.where("[2,1] <= position <= [9,8]"); //use [...] for compound index
query16 = locations.all(); //select all objects in store, no filter here


//reverse the result set
query16r1 = query16.order(-1); //, or
query16r2 = query16.order("desc"); //, or
query16r3 = query16.order("DESC");


//limit the result set (limitation always applied after order reversed.)
query16l1 = query16.limit(5); //limit to the first 5 items
query16l2 = query16.limit(3, 6); //limit to the first 6 items starting at the 3rd one


//get the first reached item
query01.first(function(item) {/*...*/});

//iterate each item
query03.each(function(item, key) {/*...*/});

//get the whole result set
query05.list(function(itemArray) {/*...*/});

//count the number of items in the result set
query07.count(function(totalNumber) {/*...*/});


//you can chaining the function call above:
IDB('app_db').store('locations').where('position < [5,9]').order(-1).limit(2,2).each(function(item) {
    //do something with each item
}).then(function() {
    //do something after query
});
```