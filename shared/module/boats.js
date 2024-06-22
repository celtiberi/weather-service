const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const getDotEnvPath = (env) => {
  if (env === 'TEST') {
    return '.env.test';
  }
  return '.env';
};

dotenv.config({
  path: path.resolve(
    process.cwd(),
    getDotEnvPath(process.env.NODE_ENV?.toUpperCase())
  ),
});

const fs = require('fs');
function getSecret(envVar) {
  const secretPath = process.env[envVar];
  if (secretPath && secretPath.startsWith('/run/secrets/')) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  return process.env[envVar];
}

const mongodbUri = getSecret('MONGODB_URI');
console.log('Connecting to MongoDB...' + mongodbUri);
mongoose.connect(mongodbUri);





const mongooseConnectionPromise = new Promise((resolve, reject) => {
  mongoose.connection.on('open', () => {
    console.log('MongoDB connection successful');
    resolve(mongoose.connection);
  });
  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
    reject(error);
  });
});

const boatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
  },
  waypoints: [
    {
      _id: false,
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      lat: {
        type: Number,
        required: true
      },
      lon: {
        type: Number,
        required: true
      }
    }
  ],
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    lat: {
      type: Number,
      required: true
    },
    lon: {
      type: Number,
      required: true
    }
  },
  polars: {
    type: String,
    required: false,
  },
});

// Create the forecast model
const Boat = mongoose.model('Boat', boatSchema);

// Get the Forecast collection
const boatCollection = mongoose.connection.collection('boats');

module.exports = {
    Boat,
    boatCollection
  };
  
