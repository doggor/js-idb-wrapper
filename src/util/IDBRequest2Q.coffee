#turn IDBRequest to Promise
IDBRequest2Q = (request)->
	d = newDefer()
	request.onsuccess = (event)-> d.resolve(event)
	request.onerror = (event)-> d.reject(event)
	toPromise d
