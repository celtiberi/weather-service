const shapefile = require('shapefile');
const turf = require('@turf/turf');
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

mongoose.connection.on(
'error',
console.error.bind(console, 'MongoDB connection error:')
);
mongoose.connection.on(
'connected',
console.log.bind(console, 'MongoDB connection successful:')
);
mongoose.connection.once(
'open',
() => console.log('Connection to MongoDB is now open')
);

const forecastSchema = new mongoose.Schema({
zoneId: {
    type: String,
    required: true,
    unique: true,
    index: true,
},
zoneType: {
    type: String,
    required: true,
},
forecast: {
    type: String,
    required: true,
},
expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
},
});

// Create the forecast model
const Forecast = mongoose.model('Forecast', forecastSchema);

// Get the Forecast collection
const forecastCollection = mongoose.connection.collection('forecasts');


const forecast = new Forecast({
    zoneId: 10,
    zoneType: 'test',
    forecast: "test forecast",
    expiresAt: new Date(Date.now() + 100000),
  });

forecast.save();