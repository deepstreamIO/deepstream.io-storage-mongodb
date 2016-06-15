const events = require( 'events' )
const util = require( 'util' )
const pckg = require( '../package.json' )
const mongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const dataTransform = require( './transform-data' )

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
  var parts = key.split( this._splitChar ),
    collectionName,
    id

  if( parts.length === 1 ) {
    collectionName = this._defaultCollection
    id = key
  }
  else if( parts.length === 2 ) {
    collectionName = parts[ 0 ]
    id = parts[ 1 ]
  }
  else {
    return null
  }

  if( !this._collections[ collectionName ] ) {
    this._collections[ collectionName ] = this._db.collection( collectionName )
    this._collections[ collectionName ].ensureIndex({ ds_key: 1 })
  }

  return { collection: this._collections[ collectionName ], id: id }
}

module.exports = Connector