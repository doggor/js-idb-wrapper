# js-idb-wrapper
This wrapper is aimed to simplify the use of indexedDB and is designed to work as lazy as it can: all databases and object stores will not be created, upgraded or opened as long as no any explicit data operations perform.


## Quick Example
Let see if we want to get users whose age are between 16 to 20:
```js
IDB('db1').store('users').where("16 < age < 20").list(
    function(users) {
        for (var i in users)
            user = users[i];
            console.log(user.name + ": " + user.age);
    }
);
```
If you know RDBMS, there can be multiple databases inside the system. It is the same for indexedDB. We use **IDB('db1')** to obtain a reference of the database named "db1" in indexedDB. Then, retrieving a reference of store "users" by **.store('users')**. There can be multiple object stores inside a database, just like tables in RDBMS. In the store, we try query users using **.where("16 < age < 20")**. Finally, retrieve the list of users through **.list(*****handler*****)**.

it would be much clear if writing in coffeescript:
```coffee
IDB "db1"
.store "users"
.where "16 < age < 20"
.list (users) -> console.log "#{user.name}: #{user.age}" for user in users
```

> We Are Lazy!
> The database would not be opened as long as you're not going to handle the query result. it means that **IDB('db1').store('users').where("16 < age < 20")** will only returns a query object, but not actually query the stored data. The query will be made until you pass a handler, in this example, calling **.list(...)**.
> Moreover, database creation and/or upgrade will not be performed until it is going to be open for some actions.


## Installation

#### pre-requirement
This wrapper is built upon native indexedDB and highly depends on promise API. Before use it you should make sure the following 2 things:


##### 1. browser compatibility
The support of indexedDB may vary between browsers. For details, see http://caniuse.com/#feat=indexeddb

You are recommended to use indexedDB as an optional functionality of the web application, and avoid using compound key and index for IE compatibility.


##### 2. Promise/A+
This wrapper will try the following promise API providers in order:
1. [native Promise Object (ES6 feature)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
2. [q](http://documentup.com/kriskowal/q)
3. [jQuery](http://api.jquery.com/category/deferred-object/)

If none of the above can be found, this wrapper will throw an Error with message "No compatible promise function found." when initializing.


#### include script
You can manually retrieve the script file from [./release/idb.min.js](https://github.com/dogdoglization/js-idb-wrapper/blob/master/release/idb.min.js) of the repository and include it in your html file: 
```html
<script src="idb.min.js"></script>
```




## Usage

Get a database reference:
```js
//get a reference of the indexedDB named "app_db"
//it wouldn't really open the db
db = IDB('app_db');
```

Get a object store reference:
```js
//get a reference of the object store "users" inside the "app_db" indexedDB
//it wouldn't really open the db
users = IDB('app_db').store('users');
```

Define a database schema:
```js
//describing how object stores inside app_db would look like
//upgrade will be performed only when:
//  1. the db is attempt to open for actual data read/write, and
//  2. the stored db version is smaller than the largest defined version.

IDB('app_db').version(1, {
    
    //store named "users"
    "users": [
        "KEY(id) AUTO",  //the keypath of the objects will be auto increased and assgin to the property "id"
        "name",          //the property named "idx1" will be well indexed
        "email UNIQUE"   //the index will not allow duplicate values for a single key
    ],
    
    //store named "locaions"
    "locations": [
        "KEY AUTO",            //the key will be auto increased but not assign into the objects
        "name",
        "pos.x",               //can index nested porperty
        "pos.y",
        "point(pos.x,pos.y)",  //compound index, where properties "x" and "y" can be found in the objects
        "tags ARRAY"          //the index will add an entry in the index for each array element
    ]
});
```

You can upgrade the database by defining a larger version:
```js
IDB('app_db').version(1, {  //define version 1
    "store1": [
        "KEY AUTO",
        "idx1",
        "idx2 UNIQUE",
        "idx3 ARRAY"
}).version(2, {  //this is version 2
    "store1", [
        "KEY AUTO",    //do not make any change on store's keypath
        "idx1 ARRAY",  //can re-index with "multi-entry" feature
        "idx2",        //can remove "unique" feature, but cannot add it back
        "idx3",        //can re-index without "multi-entry" feature
});
//notice: the database will not upgrade util the first explicit operation perform.
```
The database will only upgrade to the largest version and skip all other smaller versions. You can, however, define different versions in your code for readability.


#### accessing stored data
The following operations will open (and upgrade if need) corresponding database to access data in stores.

Almost all of the functions will return a promise object. A promise object contains two functions to handle cases:
1. promise.catch(), to handle any exceptions raised from the operation
2. promise.then(), to retrieve function returned data


##### retrieving meta data
Get database's name:
```js
IDB('app_db').name(function(dbName) {
    console.log(dbName);  //the database's name
}).then(function() {
    //do something after name get
});
```

Get database's version:
```js
IDB('app_db').version(function(dbVersion) {
    console.log(dbVersion);  //the database's version
}).then(function() {
    //do something after version get
});
```

Get store's name:
```js
IDB('app_db').store('users').name(function(storeName) {
    console.log(storeName);  //the store's name
}).then(function() {
    //do something after name get
});
```

Get store's keypath:
```js
IDB('app_db').store('users').key().then(function(keyPath) {
    console.log(keyPath);  //the store's keypath
}).then(function() {
    //do something after keypath get
});
```

Get store's index names:
```js
IDB('app_db').store('users').indexes(function(indexNames) {
    for (var i in indexNames) { console.log(indexNames[i]); }  //array of index names
}).then(function() {
    //do something after index names get
});
```


##### access store objects
add/update/delete objects in store:
```js
users = IDB('app_db').store('users');

//add data
users.add({name: "Andy", email: "andy@mail.com"}).then(function() {
    //do something after data added
}).catch(function() {
    //fail to add data
});

//update data with key(id) = 1
users.update({id: 0, name: "Ben", email: "ben@mail.com").then(function(){
    //do something after data updated
}).catch(function() {
    //fail to update data
});

//remove data with key = 1
users.delete(0).then(function(){function(){
    //do something after data deleted
}).catch(function() {
    //fail to delete data
});

//remove all data
users.clear().then(function(){function(){
    //do something after store clear
}).catch(function() {
    //fail to clear store
});
```

You can perform multiple operations on multiple stores in one database. All actions will be execute in one transaction:
```js
//you need providing the name of the stores you want to work on
IDB("app_db").batch("users", "locations", function(users, locations) {
    users.add({name: "C", email: "C@mail.com"});
    users.add({name: "D", email: "D@mail.com"});
    users.add({name: "E", email: "E@mail.com"});
    users.update({id: 67, name: "SomeOne", email: "some@one.com"});
    
    locations.add({x: 2, y: 3});
    locations.remove(12);
}).then(function() {
    //do something after operations done
}).catch(function() {
    //fail to complete all tasks, nothing changed
});
```

##### Query
query store's objects over a defined index:
```js
locations = IDB('app_db').store('locations');


query01 = locations.where("name = China");

query02 = locations.where("name = 'Hong Kong'");  //use '...' if there are any spaces

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

query15 = locations.where("[2,1] <= position <= [9,8]");  //use [...] for compound index

query16 = locations.all();  //select all objects in store, no filter here


//reverse the result set
query16r1 = query16.order(-1);     //, or
query16r2 = query16.order("desc"); //, or
query16r3 = query16.order("DESC");


//limit the result set (limitation always applied after order reversed.)
query16l1 = query16.limit(5);  //limit to the first 5 items
query16l2 = query16.limit(3, 6);  //limit to the first 6 items starting at the 3rd one


//get the first reached item
query01.first(function(item, key) {/*...*/});

//iterate each item
query03.each(function(item, key) {/*...*/});

//get the whole result set
query05.list(function(itemArray, keyArray) {/*...*/});

//count the number of items in the result set
query07.count(function(totalNumber) {/*...*/});


//you can chaining the function call above:
IDB('app_db').store('locations').where('position < [5,9]').order(-1).limit(2,2).each(function(item, key) {
    //do something with each item
    return [key, item.x];
}).then(function(iteratedResult) {
    //do something after query
    for (var i in iteratedResult) {
        d = iteratedResult[i];
        console.log("object(key="+d[0]+") has property x with value "+d[1]);
    }
    //...
}).catch(function() {
    //fail to query data
});
```

##### remove database
To remove the whole database, use reomve() function:
```js
IDB('app_db').remove().then(function() {
    //do something after removed
}).catch(function() {
    //fail to remove database
});
```


#### on version conflict
There may be a case that the database is ready to be upgraded but it is still in use somewhere, say, an older version of web page is opened in anther tab. (see: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onblocked)

You can set a handler to deal with the case:
```js
IDB('app_db').onVersionConflict(function() {
    //handle the case here
    //for example, refresh the page
}).version(/*...*/);  //return the database reference for chaining
```
