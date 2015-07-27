class Schema
	
	
	#inner class defining object store structure
	class @Store
		
		#param (String) name: the store name
		constructor: (@name)->
			#store option
			@option =
				keyPath: null        #store's key path
				autoIncrement: null  #if store's key is auto increased
			
			#indexes of the store
			@indexes = {}
		
		
		addIndex: (name, key, isUnique, isMultiEntry)->
			if @indexes.hasOwnProperty name
				throw new IDBError "index(#{name}) duplicated at ObjectStore(#{@name})."
			else
				@indexes[name] =
					name: name
					key: key
					option:
						unique: isUnique
						multiEntry: isMultiEntry
				return
		
	#end of class @Store
	
	
	
	
	#param (Object) dbDefinition
	constructor: (dbDefinition)->
		@stores = {}  #hold @Store objects in {<store name> : <@Store object>} pairs
		
		@applyDefinition dbDefinition
	
	
	
	#param (Object) dbDefinition
	applyDefinition: (dbDefinition)->
		
		if typeof dbDefinition isnt "object"
			throw new IDBError "The database definition must be JSON."
		
		#scan db definition and fill the schema
		for storeName, storeDfn of dbDefinition
			
			#check error
			if typeof storeName isnt "string"
				throw new IDBError "Store name must be string."
				break
			
			#check error
			else if typeof storeDfn isnt "object" or storeDfn not instanceof Array
				throw new IDBError "The definition of store(#{storeName}) must be in array."
				break
				
			else
				
				store = new @constructor.Store(storeName)
				
				#scan store's indexes
				for dfn in storeDfn
					
					#check error
					if typeof dfn isnt "string"
						throw new IDBError "Index definition must be in string form."
						break
					
					#convert index definition into store object
					else
						
						#remove unnecessary spaces inside the definition
						dfn = dfn
							.trim()
							.replace /[\s\t]+/g   , " "
							.replace /\s?\(\s?/g  , "("
							.replace /\s?\)\s?/g  , ")"
							.replace /\s?\.\s?/g  , "."
						
						if dfn.match /^KEY/
							if store.option.keyPath?
								throw new IDBError("Store key duplicated.")
							
							if matcher = dfn.match /^KEY(\(.+\)).*$/
								store.option.keyPath = extract2KeyPath matcher[1]
							
							if dfn.match /AUTO$/
								store.option.autoIncrement = true
						else
							indexName = dfn.replace(/[\(\s].+/, "")
							
							if not indexName.match(/(\w|\.)+/)
								throw new IDBError "Invalid index name(#{indexName})."
							
							isUnique = if dfn.match /[\s\)]UNIQUE/g then true else false
							
							isMultiEntry = if dfn.match /[\s\)]ARRAY/g then true else false
							
							keyPath =
								if matcher = dfn.match /.+(\(.+\)).*/
									extract2KeyPath matcher[1]
								else
									indexName
							
							store.addIndex(indexName, keyPath, isUnique, isMultiEntry)
				
				#save store to schema
				@stores[storeName] = store
	
	
	
	
	
	
	
	
	
	#extract key path from string
	#examples:
	#  "(name, info.email)" -> ["name","info.email"]
	extract2KeyPath = (string)->
		
		if (opening = string.indexOf("(")) > -1
			string = string[opening + 1...string.lastIndexOf(")")]
			
			if itemStrings = string.match /[^,]+/g
				arr = ( extract2KeyPath(key.trim()) for key in itemStrings )
				if arr.length is 1 then arr[0] else arr
			else
				string
		else
			string
