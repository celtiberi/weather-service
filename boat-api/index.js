const express = require('express');
const { createLogger, boats, nws } = require('../shared/module');
const dotenv = require('dotenv');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path');
const gpx = require('gpx-parse');
const moment = require('moment');
const fileUpload = require('express-fileupload');

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

const logstashPort = process.env.LOGSTASH_PORT || 5044;
const logger = createLogger('boat-api', logstashPort);
logger.info('Boat API server started');

const app = express();
app.use(express.json());
app.use(fileUpload());

// Register a new boat
app.post('/boats', async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'Name is required in the request body' });
    }
    const { name } = req.body;
    const boat = new boats.Boat({ name });
    await boat.save();
    res.status(201).json(boat);
  } catch (error) {
    logger.error('Error registering boat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update boat waypoints
app.put('/boats/:boatId/waypoints', async (req, res) => {
  try {
    const { boatId } = req.params;

    if (!req.files || !req.files.waypoints) {
      return res.status(400).json({ error: 'No waypoints file uploaded' });
    }

    const file = req.files.waypoints;
    const data = file.data.toString('utf8');

    try {
      const parsedData = await new Promise((resolve, reject) => {
        gpx.parseGpx(data, (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        });
      });

      const waypoints = parsedData.waypoints.map(waypoint => ({
        type: 'Point',
        lat: waypoint.lat,
        lon: waypoint.lon
      }));

      const boat = await boats.Boat.findByIdAndUpdate(
        boatId,
        { waypoints },
        { new: true }
      );

      if (!boat) {
        return res.status(404).json({ error: `Boat with ID ${boatId} not found` });
      }

      res.json(boat);
    } catch (error) {
      logger.error('Error parsing GPX file:', error);
      return res.status(400).json({ error: 'Invalid GPX file' });
    }
  } catch (error) {
    logger.error('Error updating boat waypoints:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set sailing trip start time
app.put('/boats/:boatId/start-time', async (req, res) => {
  try {
    const { boatId } = req.params;
    const { startTime } = req.body;

    const utcStartTime = moment.utc(startTime);

    if (!utcStartTime.isValid()) {
      return res.status(400).json({ error: 'Invalid start time' });
    }

    const boat = await boats.Boat.findByIdAndUpdate(
      boatId,
      { startTime: utcStartTime.toDate() },
      { new: true }
    );

    if (!boat) {
      return res.status(404).json({ error: `Boat with ID ${boatId} not found` });
    }

    res.json(boat);
  } catch (error) {
    logger.error('Error setting start time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start tracking a sailing trip
app.put('/boats/:boatId/start-trip', async (req, res) => {
  try {
    const { boatId } = req.params;

    const boat = await boats.Boat.findByIdAndUpdate(
      boatId,
      { isTracking: true },
      { new: true }
    );

    if (!boat) {
      return res.status(404).json({ error: `Boat with ID ${boatId} not found` });
    }

    res.json(boat);
  } catch (error) {
    logger.error('Error starting trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update boat current GPS location
app.put('/boats/:boatId/location', async (req, res) => {
  try {
    const { boatId } = req.params;
    const { lat, lon } = req.body;

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const boat = await boats.Boat.findByIdAndUpdate(
      boatId,
      {
        currentLocation: {
          type: 'Point',
          lat: Number(lat),
          lon: Number(lon)
        }
      },
      { new: true }
    );

    if (!boat) {
      return res.status(404).json({ error: `Boat with ID ${boatId} not found` });
    }

    res.json(boat);
  } catch (error) {
    logger.error('Error updating current location:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});