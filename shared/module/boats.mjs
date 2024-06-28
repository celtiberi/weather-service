import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

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

const boatCollection = mongoose.connection.collection('boats');

export default {
    Boat,
    boatCollection
  };
