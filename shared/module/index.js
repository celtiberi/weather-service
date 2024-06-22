const nws = require('./nws');
const boats = require('./boats');
const createLogger = require('./logger');
const { connectToMongoDB, mongoose } = require('./db-connection');

module.exports = {
  nws,
  boats,
  createLogger,
  connectToMongoDB,
  mongoose
};
