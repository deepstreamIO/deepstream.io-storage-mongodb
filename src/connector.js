const events = require( 'events' )
const util = require( 'util' )
const pckg = require( '../package.json' )
const mongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const dataTransform = require( './transform-data' )
const _ = require('underscore')

/**
 * Connects deepstream to MongoDb.
 *
 * Collections, ids and performance
 * --------------------------------------------------
 * Deepstream treats its storage like a simple key value store. But there are a few things
 * we can do to speed it up when using MongoDb. Mainly: using smaller (e.g. more granular) collections and using successive Id's
 *
 *
 * To support multiple collections pass a splitChar setting to this class. This setting specifies a character
 * at which keys will be split and ordered into collections. This sounds a bit complicated, but all that means is the following:
 *
 * Imagine you want to store a few users. Just specify their recordNames as e.g.
 *
 *  user/i4vcg5j1-16n1qrnziuog
 *  user/i4vcg5x9-a2wc3g9pbhmi
 *  user/i4vcg74u-21ufhl1qs8fh
 *
 * and in your options set
 *
 * { splitChar: '/' }
 *
 * This way the MongoDB connector will create a 'user' collection the first time
 * it encounters this recordName and will subsequently store users in it. This will
 * improve the speed of read operations since MongoDb has to look through a smaller
 * amount of datasets to find your record
 *
 * On top of this, it makes sense to use successive ids. MongoDb will optimise collections
 * by putting documents with similar ids next to each other. Fortunately, the build-in getUid()
 * method of the deepstream client already produces semi-succesive ids. Notice how the first bits of the
 * ids (user/i4vcg5) are all the same. These are Base36 encoded timestamps, facilitating almost succesive ordering.
 *
 * @param {Object} options
 *
 * {
 *    // Optional: Collections for items without a splitChar or if no splitChar is specified. Defaults to 'deepstream_docs'
   defaultCollection: <String>,

   // Optional: A char that seperates the collection name from the document id. Defaults to null
   splitChar: <String>,

   // Full connection URL for MongoDb. Format is mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
   // More details can be found here: http://docs.mongodb.org/manual/reference/connection-string/
   connectionString: <String>
   }
 *
 * @constructor
 */
var Connector = function( options ) {
  this.isReady = false
  this.name = pckg.name
  this.version = pckg.version
  this._splitChar = options.splitChar || null
  this._defaultCollection = options.defaultCollection || 'deepstream_docs'
  this._db = null
  this._collections = {}

  if( !options.connectionString ) {
    throw new Error( 'Missing setting \'connectionString\'' )
  }

  mongoClient.connect( options.connectionString, this._onConnect.bind( this ) )
}

util.inherits( Connector, events.EventEmitter )

/**
 * Writes a value to the cache.
 *
 * @param {String}   key
 * @param {Object}   value
 * @param {Function} callback Should be called with null for successful set operations or with an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.set = function( key, value, callback ) {
  var params = this._getParams( key )

  if( params === null ) {
    callback( 'Invalid key ' + key )
    return
  }

  value = dataTransform.transformValueForStorage( value )
  value.ds_key = params.id
  params.collection.updateOne({ ds_key: params.id }, value, { upsert: true }, callback )
}

/**
 * Retrieves a value from the cache
 *
 * @param {String}   key
 * @param {Function} callback Will be called with null and the stored object
 *                            for successful operations or with an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.get = function( key, callback ) {
  var params = this._getParams( key )

  if( params === null ) {
    callback( 'Invalid key ' + key )
    return
  }

  params.collection.findOne({ ds_key: params.id }, ( err, doc ) => {
    if( err ) {
      callback( err )
    } else {
      if( doc === null ) {
        callback( null, null )
      } else {
        delete doc._id
        delete doc.ds_key
        doc = dataTransform.transformValueFromStorage( doc )
        callback( null, doc )
      }
    }
  })
}

/**
 * Performs find query on storage
 *
 * @param {String}   collectionName
 * @param {Object}   query
 * @param {Function} callback Will be called with null and the stored object
 *                            for successful operations or with an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.find = function( collectionName, query, callback ) {
  const collection = this._getCollection( collectionName )
  collection.find( query ).toArray( ( err, docs ) => {
    if ( err === null ) {
      const results = _.map( docs, ( doc ) => {
        delete doc._id
        delete doc.__d
        return doc
      })
      callback( null, results )
    } else {
      callback( err, null )
    }
  })
}

/**
 * Performs find query on storage
 *
 * @param {String}   collectionName
 * @param {Object}   query
 * @param {Function} callback Will be called with null and the stored object
 *                            for successful operations or with an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.findOne = function( collectionName, query, callback ) {
  const collection = this._getCollection( collectionName )
  collection.findOne( query, ( err, doc ) => {
    if ( doc === null ) {
      callback( null, null)
    } else if ( err === null ) {
      delete doc._id
      delete doc.__d
      callback( null, doc )
    } else {
      callback( err, null )
    }
  })
}

/**
 * Performs update query on storage
 *
 * @param {String}   collectionName
 * @param {Object}   criteria Conditions for the documents to update
 * @param {Object}   updateParams fields in the document to update
 * @param {Object}   options mongo defined options for the update
 * @param {Function} callback Will be called with null and the stored object
 *                            for successful operations or with an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.update = function( collectionName, criteria, updateParams, options, callback ) {
  const collection = this._getCollection( collectionName )
  collection.update( criteria, updateParams, options, callback)
}

/**
 * Deletes an entry from the cache.
 *
 * @param   {String}   key
 * @param   {Function} callback Will be called with null for successful deletions or with
 *                     an error message string
 *
 * @private
 * @returns {void}
 */
Connector.prototype.delete = function( key, callback ) {
  var params = this._getParams( key )

  if( params === null ) {
    callback( 'Invalid key ' + key )
    return
  }

  params.collection.deleteOne({ ds_key: params.id }, callback )
}

/**
 * Callback for established (or rejected) connections
 *
 * @param {String} error
 * @param {MongoClient} db
 *
 * @private
 * @returns {void}
 */
Connector.prototype._onConnect = function( err, db ) {
  if( err ) {
    this.emit( 'error', err )
    return
  }

  this._db = db
  this.isReady = true
  this.emit( 'ready' )
}

/**
 * Determines the document id and the collection
 * to use based on the provided key
 *
 * Creates the collection if it doesn't exist yet.
 *
 * Since MongoDB ObjecIDs are adhering to a specified format
 * we'll add a new field for the key called ds_key and index the
 * collection based on it
 *
 * @param {String} key
 *
 * @private
 * @returns {Object} {connection: <MongoConnection>, id: <String> }
 */
Connector.prototype._getParams = function( key ) {
  var index = key.indexOf( this._splitChar ),
    collectionName,
    id

  if( index === 0 ) {
    return null // cannot have an empty collection name
  } else if( index === -1 ) {
    collectionName = this._defaultCollection
    id = key
  } else {
    collectionName = key.substring(0, index)
    id = key.substring(index + 1)
  }

  return { collection: this._getCollection( collectionName ), id: id }
}

/**
 * Returns a MongoConnection object given its name.
 * Creates the collection if it doesn't exist yet.
 *
 * @param {String} collectionName
 *
 * @private
 * @returns {Object} <MongoConnection>
 */
Connector.prototype._getCollection = function( collectionName ) {
  if( !this._collections[ collectionName ] ) {
    this._collections[ collectionName ] = this._db.collection( collectionName )
    this._collections[ collectionName ].ensureIndex({ ds_key: 1 })
  }

  return this._collections[ collectionName ]
}

module.exports = Connector
