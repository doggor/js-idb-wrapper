#turn IDBTransaction to Promise
IDBTx2Q = (tx)->
	d = newDefer()
	tx.onComplete = (event)-> d.resolve(event)
	tx.onerror = tx.onabort = (event)-> d.reject(event)
	d.promise
