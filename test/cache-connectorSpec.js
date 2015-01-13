/* global describe, expect, it, jasmine */
var CacheConnector = require( '../src/connector' ),
	EventEmitter = require( 'events' ).EventEmitter,
	settings = { connectionString: 'mongodb://test:test@paulo.mongohq.com:10087/munchkin-dev', splitChar: '/' },
	MESSAGE_TIME = 20;

describe( 'the message connector has the correct structure', function(){
	var cacheConnector;
	it( 'throws an error if required connection parameters are missing', function(){
		expect(function(){ new CacheConnector( 'gibberish' ); }).toThrow();
	});
	
	it( 'creates the cacheConnector', function( done ){
		cacheConnector = new CacheConnector( settings );
		expect( cacheConnector.isReady ).toBe( false );
		cacheConnector.on( 'error', function( err ){ throw err; });
		cacheConnector.on( 'ready', done );
	});
	
	it( 'implements the cache/storage connector interface', function() {
	    expect( typeof cacheConnector.name ).toBe( 'string' );
	    expect( typeof cacheConnector.version ).toBe( 'string' );
	    expect( typeof cacheConnector.get ).toBe( 'function' );
	    expect( typeof cacheConnector.set ).toBe( 'function' );
	    expect( typeof cacheConnector.delete ).toBe( 'function' );
	    expect( cacheConnector instanceof EventEmitter ).toBe( true );
	});
	
	it( 'parses keys', function() {
		var params = cacheConnector._getParams( 'user/a' );
		expect( params.collection.collectionName ).toBe( 'user' );
		expect( params.id ).toBe( 'a' );
		
		params = cacheConnector._getParams( 'bla' );
		expect( params.collection.collectionName ).toBe( 'deepstream_docs' );
		expect( params.id ).toBe( 'bla' );
		
		params = cacheConnector._getParams( 'a/b/c' );
		expect( params ).toBe( null );
	});
	
	it( 'refuses updates with invalid keys', function() {
	    cacheConnector.set( '/a/b/c', {}, function( err ){
	    	expect( err ).toBe( 'Invalid key /a/b/c' );
	    });
	});
	
	it( 'retrieves a non existing value', function( done ){
		cacheConnector.get( 'someValue', function( error, value ){
			expect( error ).toBe( null );
			expect( value ).toBe( null );
			done();
		});
	});
	
	it( 'sets a value', function( done ){
		cacheConnector.set( 'someValue', { firstname: 'Wolfram' }, function( error ){
			expect( error ).toBe( null );
			done();
		});
	});
	
	it( 'retrieves an existing value', function( done ){
		cacheConnector.get( 'someValue', function( error, value ){
			expect( error ).toBe( null );
			expect( value ).toEqual( { firstname: 'Wolfram' } );
			done();
		});
	});
	
	it( 'deletes a value', function( done ){
		cacheConnector.delete( 'someValue', function( error ){
			expect( error ).toBe( null );
			done();
		});
	});
	
	it( 'Can\'t retrieve a deleted value', function( done ){
		cacheConnector.get( 'someValue', function( error, value ){
			expect( error ).toBe( null );
			expect( value ).toBe( null );
			done();
		});
	});
});