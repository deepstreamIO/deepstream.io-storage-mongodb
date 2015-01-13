var events = require( 'events' ),
	util = require( 'util' ),
	pckg = require( '../package.json' ),
	mongodb = require( 'mongodb' );

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
 * 	user/i4vcg5j1-16n1qrnziuog
 *	user/i4vcg5x9-a2wc3g9pbhmi
 *	user/i4vcg74u-21ufhl1qs8fh
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
 	 mongoDbUrl: <String>
   }
 *
 * @constructor
 */
var Connector = function( options ) {
	this.isReady = false;
	this.name = pckg.name;
	this.version = pckg.version;
};

util.inherits( Connector, events.EventEmitter );

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
	
};

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
	
};

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
	
};

module.exports = Connector;