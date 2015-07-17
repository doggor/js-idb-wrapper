#ES6
if typeof env.Promise isnt "undefined"
	newDefer = ()-> new Promise
	toPromise = (deferred)-> deferred

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
