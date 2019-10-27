export const config = {
  connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://127.0.0.1',
  db: 'deepstream',
  defaultCollection: 'default',
  splitChar: '/'
}
