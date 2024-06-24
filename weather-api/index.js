const express = require('express');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path');
const { createLogger, nws } = require('../shared/module');
const { analyzeWeatherForecast } = require('./forecast-analysis.js');
const mongoose = require('mongoose');


const dotenv = require('dotenv');
const getDotEnvPath = (env) => {
  if (env === 'TEST') {
    return '.env.test';
  }
  return '.env';
};
dotenv.config({ path: path.resolve(process.cwd(), getDotEnvPath(process.env.NODE_ENV?.toUpperCase())) });

const logger = createLogger('weather-api', process.env.LOGSTASH_PORT || 5044);
logger.info('Hello, weather-api');

const app = express();
app.use(express.json());


logger.info(`RABBITMQ_URL: ${process.env.RABBITMQ_URL}`);

// ------- RABBIT SETUP -------
// TODO not sure I need this here.  Maybe just in the push notification code when I make it?
// When I am track a boats waypoints I will need it in that code as well.
const rabbit = jackrabbit(process.env.RABBITMQ_URL);
var exchange = rabbit.default();
var forecastUpdate = exchange.queue({ name: 'forecast_update' });
//  ---------------------------


const userSchema = new mongoose.Schema({
  userId: String,
  lastPosition: {
    lat: Number,
    lng: Number,
    updatedAt: { type: Date, default: Date.now }
  },
  pushSubscription: Object,
  deviceType: { type: String, enum: ['web', 'mobile'], required: true },
  registeredAt: { type: Date, default: Date.now }
});



app.get('/point-forecast', async (req, res) => {
  try {
    logger.info(`[GET] /point-forecast with lat: ${req.query.lat} and lon: ${req.query.lon}`);

    const coordinate = {
      lat: parseFloat(req.query.lat),
      lon: parseFloat(req.query.lon),
    };

    let forecasts = await nws.getPointForecasts(coordinate.lat, coordinate.lon)
    
    if (!forecasts && (!forecasts['coastal'] && !forecasts['offshore'] && !forecasts['high_seas']))
    {
      res.status(404).send("No forecast available for the selected location.");
      return;
    }

    forecastsAnalysis = await analyzeWeatherForecast(forecasts);
    res.json({ forecastsAnalysis, forecasts });
    
  } catch (error) {
    logger.error(`Error fetching point forecasts: ${error.message}`);
    res.status(500).send(error.message);
  }
});

let server

async function startServer() {
  try {
    // ------- CONNECT TO MONGODB --------

    console.log("Attempting to connect to MongoDB...");
    //const mongodbUri = 'mongodb+srv://admin:ay5HG8TYzT0MMsTx@cluster0.ml7brdd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const mongodbUri = 'mongodb://mongodb:27017/ocean';
    //const mongodbUri = 'mongodb://127.0.0.1:27017/ocean';
    mongoose.connect(mongodbUri).then(() => {
      logger.info('Mongoose connected to MongoDB');
      logger.info(`Mongoose connection ready state: ${mongoose.connection.readyState}`);
    })
    .catch((err) => {
      logger.error('Mongoose connection error:', err);
      process.exit(1);
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
      process.exit(1);
    });

    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      mongoose.connect(mongodbUri, { useUnifiedTopology: true })
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });
    // ------------------------------------
    server = app.listen(3100, () => {
      logger.info('Server is running on port 3100');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = server;