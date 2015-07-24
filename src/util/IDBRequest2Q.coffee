#turn IDBRequest to Promise
IDBRequest2Q = (request)->
	d = newDefer()
	request.onsuccess = (event)-> d.resolve(event)
	request.onerror = request.onblocked = (event)-> d.reject(event)
	toPromise d
