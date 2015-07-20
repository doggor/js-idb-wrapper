class Schema
	
	
	#hold @Store objects in {<store name> : <@Store object>} pairs
	stores: {}
	
	
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
							.replace /(\s|\t)+/g  , " "
							.replace /\s?\(\s?/g  , "("
							.replace /\s?\)\s?/g  , ")"
							.replace /\s?,\s?/g   , ","
							.replace /\s?\+\s?/g  , "+"
							.replace /\s?\.\s?/g  , "."
						
						if dfn.match /^KEY/
							if store.option.keyPath?
								throw new IDBError("Store key duplicated.")
							
							if dfn.match /^KEY\(.+\)/
								store.option.keyPath = string2KeyPath dfn[4...dfn.indexOf ")"]
							
							if dfn.match /AUTO$/
								store.option.autoIncrement = true
						else
							indexName = dfn.replace(/\(.+\)/, "").replace(/( UNIQUE)$/, "")
							
							if not indexName.match(/(\w|\.)+/)
								throw new IDBError "Invalid index name(#{indexName})."
							
							isUnique = if dfn.match /( UNIQUE)$/ then true else false
							
							isMultiEntry = false  #default
							
							keyPath =
								if dfn.match /^.+\(.+\)/
									isMultiEntry = true if dfn.indexOf(",") > -1
									if isMultiEntry and dfn.indexOf("+") > -1
										throw new IDBError "Fail to parse definition(#{string}): ',' and '+' cannot state in the same definition."
									string2KeyPath dfn[dfn.indexOf("(")+1...dfn.indexOf ")"]
								else
									index2KeyPath indexName
							
							store.addIndex(indexName, keyPath, isUnique, isMultiEntry)
				
				#save store to schema
				@stores[storeName] = store
	
	
	#extract key path from string
	#examples:
	#  "name.first,name.last,nick" -> [["name","first"],["name","last"],"nick"]
	#  "country+city+region+street" -> ["country","city","region","street"]
	#  "info.email" -> ["info","email"]
	string2KeyPath = (string)->
		if string.indexOf(",") > -1
			( string2KeyPath(keyPath) for keyPath in string.split "," )
		else if string.indexOf("+") > -1
			( string2KeyPath(keyPath) for keyPath in string.split "+" )
		else
			string = string.replace(".", ",") if string.indexOf(".") > -1
			
			if string.match /^(\'\'|\"\")$/
				""
			else if string.match /(\'|\")/g
				throw new IDBError "Fail to parse definition(#{string}): quotation mark not in pairs."
			else
				string
	
	
	#extract index name to key path
	#examples:
	#  "address.country" -> ["address","country"]
	#  "name" -> "name"
	index2KeyPath = (indexName)->
		if indexName.indexOf(".") > -1
			indexName.split(".")
		else
			indexName
	
