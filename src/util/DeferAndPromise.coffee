###
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

###




#ES6
if typeof env.Promise isnt "undefined"
	newDefer = ()->
		promiseObj = {}
		promiseObj.promise =
		new Promise (promiseResolve, promiseReject)->
			promiseObj.resolve = promiseResolve
			promiseObj.reject = promiseReject
		promiseObj
			
	toPromise = (deferred)-> deferred.promise
	
	
#Q.js
else if typeof env.Q isnt "undefined"
	newDefer = ()-> Q.defer()
	toPromise = (deferred)-> deferred.promise
	
	
#Jquery
else if typeof env.jQuery isnt "undefined"
	newDefer = ()-> jQuery.Deferred()
	toPromise = (deferred)->
		deferred.promise(catch : (fn)-> @fail(fn))
	
	
else
	throw new IDBError "Not compatible promise function found."


newPromise = (result, error)->
	d = newDefer()
	if result
		d.resolve(result)
	else if error
		d.reject(error)
	else
		throw new Error("either result or error must provided to newPromise().")
	toPromise(d)
