#turn IDBTransaction to Promise
IDBTx2Q = (tx)->
	d = newDefer()
	tx.oncomplete = (event)-> d.resolve(event)
	tx.onerror = tx.onabort = (event)-> d.reject(event)
	toPromise d
