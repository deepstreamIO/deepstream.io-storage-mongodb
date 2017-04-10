/* global describe, expect, it, jasmine */
const expect = require('chai').expect
const CacheConnector = require( '../src/connector' )
const EventEmitter = require( 'events' ).EventEmitter
const settings = {
  connectionString: process.env.MONGODB_CONNECTION_STRING,
  splitChar: '/'
}
const MESSAGE_TIME = 20

describe( 'the message connector has the correct structure', () => {
  var cacheConnector
  it( 'throws an error if required connection parameters are missing', () => {
    expect(() => { new CacheConnector( 'gibberish' ) }).to.throw()
  })

  it( 'creates the cacheConnector', ( done ) => {
    cacheConnector = new CacheConnector( settings )
    expect( cacheConnector.isReady ).to.equal( false )
    cacheConnector.on( 'error', ( err ) => { throw err })
    cacheConnector.on( 'ready', done )
  })

  it( 'implements the cache/storage connector interface', () => {
    expect( typeof cacheConnector.name ).to.equal( 'string' )
    expect( typeof cacheConnector.version ).to.equal( 'string' )
    expect( typeof cacheConnector.get ).to.equal( 'function' )
    expect( typeof cacheConnector.set ).to.equal( 'function' )
    expect( typeof cacheConnector.delete ).to.equal( 'function' )
    expect( cacheConnector instanceof EventEmitter ).to.equal( true )
  })

  it( 'parses keys', () => {
    var params = cacheConnector._getParams( 'user/a' )
    expect( params.collection.s.name ).to.equal( 'user' )
    expect( params.id ).to.equal( 'a' )

    params = cacheConnector._getParams( 'bla' )
    expect( params.collection.s.name ).to.equal( 'deepstream_docs' )
    expect( params.id ).to.equal( 'bla' )

    params = cacheConnector._getParams( 'a/b/c' )
    expect( params.collection.s.name ).to.equal( 'a' )
    expect( params.id ).to.equal( 'b/c' )
  })

  it( 'refuses updates with invalid keys', () => {
    cacheConnector.set( '/a/b/c', {}, ( err ) => {
      expect( err ).to.equal( 'Invalid key /a/b/c' )
    })
  })

  it( 'retrieves a non existing value', ( done ) => {
    cacheConnector.get( 'someValue', ( error, value ) => {
      expect( error ).to.equal( null )
      expect( value ).to.equal( null )
      done()
    })
  })

  it( 'sets a value', ( done ) => {
    cacheConnector.set( 'someValue', { _d: { v: 10 }, firstname: 'Wolfram' }, ( error ) => {
      expect( error ).to.equal( null )
      done()
    })
  })

  it( 'retrieves an existing value', ( done ) => {
    cacheConnector.get( 'someValue', ( error, value ) => {
      expect( error ).to.equal( null )
      expect( value ).to.deep.equal( { _d: { v: 10 }, firstname: 'Wolfram' } )
      done()
    })
  })

  it( 'deletes a value', ( done ) => {
    cacheConnector.delete( 'someValue', ( error ) => {
      expect( error ).to.equal( null )
      done()
    })
  })

  it( 'Can\'t retrieve a deleted value', ( done ) => {
    cacheConnector.get( 'someValue', ( error, value ) => {
      expect( error ).to.equal( null )
      expect( value ).to.equal( null )
      done()
    })
  })
})
