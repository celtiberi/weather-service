
const mongoose = require('mongoose');
const fs = require('fs');

function getSecret(envVar) {
  const secretPath = process.env[envVar];
  if (secretPath && secretPath.startsWith('/run/secrets/')) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  return process.env[envVar];
}

const mongodbUri = getSecret('MONGODB_URI');
let isConnected = false;

function logConnectionStatus() {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`Mongoose connection status: ${states[mongoose.connection.readyState]}`);
}

async function connectToMongoDB() {
  if (isConnected && mongoose.connection.readyState === 1) return mongoose.connection;

  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongodbUri);
    isConnected = true;
    console.log('Connected to MongoDB successfully');
    logConnectionStatus();
    return mongoose.connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('Lost MongoDB connection. Retrying...');
  isConnected = false;
  connectToMongoDB();
});

module.exports = { connectToMongoDB, mongoose };