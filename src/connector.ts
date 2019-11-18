import * as pkg from '../package.json'
import { MongoClient, Db, Collection } from 'mongodb'
import { DeepstreamPlugin, DeepstreamStorage, DeepstreamServices, StorageWriteCallback, StorageReadCallback, EVENT } from '@deepstream/types'
import { JSONObject } from '@deepstream/protobuf/dist/types/all'

interface MongoOptions {
  connectionString: any
  db: string
  defaultCollection: string
  splitChar: string
}

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
 * {
 *    // Optional: Collections for items without a splitChar or if no splitChar is specified. Defaults to 'deepstream_docs'
   defaultCollection: <String>,

   // Optional: A char that seperates the collection name from the document id. Defaults to null
   splitChar: <String>,

   // Full connection URL for MongoDb. Format is mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
   // More details can be found here: http://docs.mongodb.org/manual/reference/connection-string/
   connectionString: <String>
   }
 */
export class Connector extends DeepstreamPlugin implements DeepstreamStorage {
  public apiVersion?: number | undefined

  public description = `MongoDB Storage ${pkg.version} using db ${this.options.db}`

  private splitChar: string = this.options.splitChar || '/'
  private defaultCollection = this.options.defaultCollection || 'deepstream_docs'
  private collections = new Map<string, Collection>()
  private logger = this.services.logger.getNameSpace('MONGODB')

  private client: MongoClient
  private db!: Db

  constructor (private options: MongoOptions, private services: DeepstreamServices) {
    super()

    if (!this.options.connectionString) {
      this.logger.fatal(EVENT.PLUGIN_INITIALIZATION_ERROR, "Missing setting 'connectionString'")
    }

    this.client = new MongoClient(options.connectionString, { useUnifiedTopology: true })
    this.client.connect()
  }

  public async whenReady () {
    this.client = await this.client.connect()
    this.db = this.client.db(this.options.db)
  }

  /**
   * Writes a value to the cache.
   */
  public set (key: string, version: number, value: JSONObject, callback: StorageWriteCallback) {
    const params = this.getParams(key)

    if (value instanceof Array) {
      value = { ds_list: value }
    }

    if (params === null) {
      callback(`Invalid key ${key}`)
      return
    }

    value.ds_key = params.id
    value.ds_version = version
    params.collection.updateOne(
      { ds_key: params.id },
      { $set: value },
      { upsert: true },
      callback as any
    )
  }

  /**
   * Retrieves a value from the cache
   */
  public get (key: string, callback: StorageReadCallback) {
    const params = this.getParams(key )

    if ( params === null ) {
      callback(`Invalid key ${key}`)
      return
    }

    params.collection.findOne({ ds_key: params.id }, (error, doc) => {
      if (error) {
        // this.logger.error(EVENT.ERROR, 'Error retrieving mongodb entry', { error })
        callback('Error getting object')
        return
      }

      if (doc === null) {
        callback(null, -1, null)
        return
      }

      const version = doc.ds_version
      delete doc._id
      delete doc.ds_key
      delete doc.ds_version

      if (doc.ds_list instanceof Array) {
        doc = doc.ds_list
      }

      callback( null, version, doc)
    })
  }

  /**
   * Deletes an entry from the cache.
   */
  public delete (key: string, callback: StorageWriteCallback) {
    const params = this.getParams(key)

    if (params === null) {
      callback('Invalid key ' + key )
      return
    }

    params.collection.deleteOne({ ds_key: params.id }, callback as any)
  }

  public deleteBulk (recordNames: string[], callback: StorageWriteCallback): void {
    throw new Error('Method not implemented.')
  }

  /**
   * Determines the document id and the collection
   * to use based on the provided key
   *
   * Creates the collection if it doesn't exist yet.
   *
   * Since MongoDB Object IDs are adhering to a specified format
   * we'll add a new field for the key called ds_key and index the
   * collection based on it
   */
  public getParams (key: string) {
    const index = key.indexOf(this.splitChar)
    let collectionName
    let id

    if ( index === 0 ) {
      return null // cannot have an empty collection name
    }

    if ( index === -1 ) {
      collectionName = this.defaultCollection
      id = key
    } else {
      collectionName = key.substring(0, index)
      id = key.substring(index + 1)
    }

    return { collection: this.getCollection(collectionName), id }
  }

  /**
   * Returns a MongoConnection object given its name.
   * Creates the collection if it doesn't exist yet.
   */
  public getCollection (collectionName: string) {
    let collection = this.collections.get(collectionName)
    if (!collection) {
      collection = this.db.collection(collectionName)
      collection.createIndex('ds_key') // this is async
      this.collections.set(collectionName, collection)
    }
    return collection
  }

}

export default Connector
