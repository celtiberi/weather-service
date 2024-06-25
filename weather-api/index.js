process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

const express = require('express');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { createLogger, nws } = require('../shared/module');
const { analyzeWeatherForecast } = require('./forecast-analysis.js');

// Load environment variables
const getDotEnvPath = (env) => env === 'TEST' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), getDotEnvPath(process.env.NODE_ENV?.toUpperCase())) });

// Set up logger
const logger = createLogger('weather-api', process.env.LOGSTASH_PORT || 5044);

// Initialize Express app
const app = express();
app.use(express.json());

// Set up morgan for HTTP request logging
app.use(morgan('dev'));

// RabbitMQ setup
logger.info(`RABBITMQ_URL: ${process.env.RABBITMQ_URL}`);
const rabbit = jackrabbit(process.env.RABBITMQ_URL);
const exchange = rabbit.default();

// MongoDB User Schema
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

const User = mongoose.model('User', userSchema);

// API Routes
app.get('/point-forecast', async (req, res) => {
  try {
    logger.info(`[GET] /point-forecast with lat: ${req.query.lat} and lon: ${req.query.lon}`);

    const coordinate = {
      lat: parseFloat(req.query.lat),
      lon: parseFloat(req.query.lon),
    };

    let forecasts = await nws.getPointForecasts(coordinate.lat, coordinate.lon);
    
    if (!forecasts || (!forecasts['coastal'] && !forecasts['offshore'] && !forecasts['high_seas'])) {
      return res.status(404).send("No forecast available for the selected location.");
    }

    const forecastsAnalysis = await analyzeWeatherForecast(forecasts);
    res.json({ forecastsAnalysis, forecasts });
    
  } catch (error) {
    logger.error(`Error fetching point forecasts: ${error.message}`);
    res.status(500).send(error.message);
  }
});

app.post('/register', async (req, res) => {
  const { userId, deviceType } = req.body;

  if (!userId || !deviceType) {
    return res.status(400).json({ error: 'User ID and device type are required' });
  }

  try {
    await User.findOneAndUpdate(
      { userId },
      { userId, deviceType },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Error during registration:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});

app.post('/unregister', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const result = await User.findOneAndDelete({ userId });

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User unregistered successfully' });
  } catch (error) {
    logger.error('Error during unregistration:', error);
    res.status(500).json({ error: 'An error occurred during unregistration' });
  }
});

app.post('/update-position', async (req, res) => {
  const { userId, latitude, longitude } = req.body;

  if (!userId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'User ID, latitude, and longitude are required' });
  }

  try {
    const result = await User.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          'lastPosition.lat': latitude,
          'lastPosition.lng': longitude,
          'lastPosition.updatedAt': new Date()
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'Position updated successfully' });
  } catch (error) {
    logger.error('Error updating position:', error);
    res.status(500).json({ error: 'An error occurred while updating position' });
  }
});

// Server startup
let server;
async function startServer() {
  try {
    const mongodbUri = 'mongodb://mongodb:27017/ocean';
    await mongoose.connect(mongodbUri);
    logger.info('Mongoose connected to MongoDB');

    server = app.listen(3100, () => {
      logger.info('Server is running on port 3100');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
  process.exit(1);
});

mongoose.connection.on('disconnected', () => {
  logger.info('MongoDB disconnected. Attempting to reconnect...');
  mongoose.connect(mongodbUri, { useUnifiedTopology: true });
});



// Start the server
startServer();

module.exports = server;