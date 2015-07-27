#turn IDBRequest to Promise
IDBRequest2Q = (request)->
	deferred = newDefer()
	request.onsuccess = (event)-> deferred.resolve(event)
	request.onerror = request.onblocked = (event)-> deferred.reject(event)
	toPromise deferred
