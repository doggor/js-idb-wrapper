#turn IDBRequest to Promise
IDBRequest2Q = (request)->
	deferred = newDefer()
	request.onsuccess = (event)-> deferred.resolve(event)
	request.onerror = (event)-> deferred.reject(event)
	toPromise deferred
