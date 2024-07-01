import process from 'process';
import express from 'express';
import jackrabbit from '@pager/jackrabbit';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { createLogger, nws } from '../shared/module/index.mjs';
import { analyzeWeatherForecast } from './forecast-analysis.mjs';
import { fetchRssData, getShapefiles } from './cyclone-data.mjs';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1); // Exit the process to avoid unknown state
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1); // Exit the process to avoid unknown state
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const getDotEnvPath = (env) => env === 'TEST' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), getDotEnvPath(process.env.NODE_ENV?.toUpperCase())) });

// Set up logger
const logger = createLogger('weather-api', process.env.LOGSTASH_PORT || 5044);

// Initialize Express app
const app = express();
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: [
    'http://207.5.194.71:3000', 
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://channel-16.com:3000', 
    'https://channel-16.com:3000', 
    'http://channel-16.com', 
    'https://channel-16.com',
    'http://www.channel-16.com',
    'https://www.channel-16.com', 
    'https://www.channel-16.com/api',
    'http://www.channel-16.com/api'
  ], // Add any other origins you need
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

app.get('/cyclone-data', async (req, res) => {
  try {
    const rssData = await fetchRssData();
    res.json(rssData);
  } catch (error) {
    logger.error('Error fetching cyclone RSS data:', error);
    res.status(500).json({ error: 'Failed to fetch cyclone data' });
  }
});

app.get('/cyclone-shapefiles', async (req, res) => {
  try {
    const shapefiles = await getShapefiles();
    res.json(shapefiles);
  } catch (error) {
    logger.error('Error fetching cyclone shapefiles:', error);
    res.status(500).json({ error: 'Failed to fetch cyclone shapefiles' });
  }
});

async function connectToMongoDB() {

  const mongodbUri = 'mongodb://mongodb:27017/ocean';
  try {
    await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('Mongoose connected to MongoDB');
    console.log(`Mongoose connection ready state: ${mongoose.connection.readyState}`);

    mongoose.connection.on('disconnected', () => {
      console.log('Disconnected from MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Server startup
let server;
async function startServer() {
  try {
    await connectToMongoDB();

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

export default server;