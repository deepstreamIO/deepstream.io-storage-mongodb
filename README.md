# deepstream.io-storage-mongodb [![npm version](https://badge.fury.io/js/%40deepstream%2Fstorage-mongodb.svg)](https://badge.fury.io/js/%40deepstream%2Fstorage-mongodb)

[deepstream](http://deepstream.io) storage connector for [mongodb](https://www.mongodb.org/)

This connector uses [the npm mongodb package](https://www.npmjs.com/package/mongodb). Please have a look there for detailed options.

## Basic Setup
```yaml
plugins:
  storage:
    name: mongodb
    options:
      connectionString: ${MONGODB_CONNECTION_STRING}/someDb
      defaultCollection: 'someTable'
      splitChar: '/'
```

```javascript
var Deepstream = require( 'deepstream.io' ),
    MongoDBStorageConnector = require( 'deepstream.io-storage-mongodb' ),
    server = new Deepstream();

server.set( 'storage', new MongoDBStorageConnector( {
  connectionString: 'mongodb://test:test@paulo.mongohq.com:10087/munchkin-dev',
  splitChar: '/'
}));

server.start();
```
