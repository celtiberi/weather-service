import shapefile from 'shapefile';
import * as turf from '@turf/turf';
import path from 'path';
import dotenv from 'dotenv';
import tzlookup from 'tz-lookup';
import moment from 'moment-timezone';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function connectToMongoDB() {
  console.log('[nws.mjs] Connecting to MongoDB');
  const mongodbUri = 'mongodb://mongodb:27017/ocean';
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('[nws.mjs] Using existing MongoDB connection');
      return;
    }

    await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('[nws.mjs] Mongoose connected to MongoDB');
    console.log(`[nws.mjs] Mongoose connection ready state: ${mongoose.connection.readyState}`);

    mongoose.connection.on('disconnected', () => {
      console.log('[nws.mjs] Disconnected from MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('[nws.mjs] MongoDB connection error:', error);
    });

  } catch (error) {
    console.error('[nws.mjs] Error connecting to MongoDB:', error);
    throw error;
  }
}

connectToMongoDB();

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
  timeZone: {
    type: String,
    required: true,
  },
  expires: {
    type: Date,
    required: true,
  }
});

const Forecast = mongoose.model('Forecast', forecastSchema);

const forecastCollection = mongoose.connection.collection('forecasts');

// Define paths for marine zone shapefiles and dbf files
// Files come from https://www.weather.gov/gis/MarineZones
// TODO these zones get updated! They should probably be downloaded daily or checked the web page
//      text to see if there has been an update
const coastalMarineZonesShapeFile = path.join(
  __dirname,
  '..',
  'geodata',
  'mz05mr24.shp'
);
const coastalMarineZonesDbfFile = path.join(
  __dirname,
  '..',
  'geodata',
  'mz05mr24.dbf'
);
const offshoreMarineZonesShapeFile = path.join(
  __dirname,
  '..',
  'geodata',
  'oz05mr24.shp'
);
const offshoreMarineZonesDbfFile = path.join(
  __dirname,
  '..',
  'geodata',
  'oz05mr24.dbf'
);
const highSeasMarineZonesShapeFile = path.join(
  __dirname,
  '..',
  'geodata',
  'hz30jn17.shp'
);
const highSeasMarineZonesDbfFile = path.join(
  __dirname,
  '..',
  'geodata',
  'hz30jn17.dbf'
);

const handleShapefileError = (err) => {
  console.error('Error loading coastal marine zones shapefile:', err);
  throw err;
};

const coastalGeojsonPromise = shapefile
  .read(coastalMarineZonesShapeFile, coastalMarineZonesDbfFile)
  .catch(handleShapefileError);
const offshoreGeojsonPromise = shapefile
  .read(offshoreMarineZonesShapeFile, offshoreMarineZonesDbfFile)
  .catch(handleShapefileError);
const highSeasGeojsonPromise = shapefile
  .read(highSeasMarineZonesShapeFile, highSeasMarineZonesDbfFile)
  .catch(handleShapefileError);

// TODO marineZones will not change so no reason to not cache it after the first call.  Should prob cache when the file loads
let marineZones = null;
async function getMarineZones() {
  if (marineZones) {
    return marineZones;
  } else {
    return  await Promise.all([
      coastalGeojsonPromise,
      offshoreGeojsonPromise,
      highSeasGeojsonPromise,
    ]).then(([coastalGeojson, offshoreGeojson, highSeasGeojson]) => {
      let coastalZones = {};
      coastalGeojson.features.forEach((feature) => {
        coastalZones[feature.properties['ID']] = feature.properties;
      });

      let offshoreZones = {};
      offshoreGeojson.features.forEach((feature) => {
        offshoreZones[feature.properties['ID']] = feature.properties;
      });

      let highSeasZones = {};
      highSeasGeojson.features.forEach((feature) => {
        // for some stupid reason the highseas zones do not have an ID.  Stupid
        highSeasZones[feature.properties['NAME']] = feature.properties;
        highSeasZones[feature.properties['NAME']]['ID'] =
          feature.properties['NAME'];
      });

      marineZones = {
        coastal: coastalZones,
        offshore: offshoreZones,
        high_seas: highSeasZones,
      };

      return marineZones;
    }).catch((error) => {
      console.error('Error getting marine zones:', error);
      throw error;
    });
  }
}

// Identify marine zone based on latitude and longitude
async function getMarineZonesByGPS(lat, lon) {
  // Await loading of geojson data for each marine zone type
  const coastalGeojson = await coastalGeojsonPromise;
  const offshoreGeojson = await offshoreGeojsonPromise;
  const highSeasGeojson = await highSeasGeojsonPromise;

  // Create a point from the provided latitude and longitude
  const point = turf.point([lon, lat]);

  // Filter matching zones across all marine zone types and include the type of zone
  const coastalZone = coastalGeojson.features.filter((feature) =>
    turf.booleanPointInPolygon(point, feature.geometry)
  )[0];
  const offshoreZone = offshoreGeojson.features.filter((feature) =>
    turf.booleanPointInPolygon(point, feature.geometry)
  )[0];
  const highSeasZone = highSeasGeojson.features.filter((feature) =>
    turf.booleanPointInPolygon(point, feature.geometry)
  )[0];

  const zones = {
    coastal: coastalZone ? coastalZone.properties : null,
    offshore: offshoreZone ? offshoreZone.properties : null,
    high_seas: highSeasZone ? highSeasZone.properties : null,
  };

  return zones;
}

async function getPointForecasts(lat, lon) {
  const zones = await getMarineZonesByGPS(lat, lon);
  let coastalForecast = null;
  let offshoreForecast = null;
  let highSeasForecast = null;

  const findForecast = async (zone, id) => {
    if (!zones[zone]) {
      return null;
    }
    const result = await Forecast.findOne({ zoneId: zones[zone][id] });
    return result ? result.toObject() : null;
  }

  coastalForecast = await findForecast('coastal', 'ID');
  offshoreForecast = await findForecast('offshore', 'ID');
  highSeasForecast = await findForecast('high_seas', 'NAME');

  return {
    coastal: coastalForecast,
    offshore: offshoreForecast,
    high_seas: highSeasForecast,
  };
}

async function getLocalTimeForZone(zoneId, zoneType) {
  let geojsonPromise;
  if (zoneType === 'coastal') {
    geojsonPromise = coastalGeojsonPromise;
  } else if (zoneType === 'offshore') {
    geojsonPromise = offshoreGeojsonPromise;
  } else if (zoneType === 'high_seas') {
    geojsonPromise = highSeasGeojsonPromise;  
  }
  
  let geojson = await geojsonPromise;

  const zoneFeature = geojson.features.find(feature => feature.properties["ID"] === zoneId);
  const zoneCenter = turf.center(zoneFeature);
  const zoneCenterCoords = zoneCenter.geometry.coordinates;
  const zoneCenterLat = zoneCenterCoords[1];
  const zoneCenterLon = zoneCenterCoords[0];
  const timeZone = tzlookup(zoneCenterLat, zoneCenterLon);

  return timeZone;
}

function getForecastExpirationTime(forecast, timeZone) {
  logger.debug(`Parsing forecast for timezone: ${timeZone}`);
  logger.debug(`Forecast text (first 200 chars): ${forecast.substring(0, 200)}...`);

  let expiresAt;

  const expiresAtMatch = forecast.match(/Expires:(\d{12})/);
  if (expiresAtMatch) {
    const expiresAtString = expiresAtMatch[1];
    expiresAt = moment.tz(expiresAtString, 'YYYYMMDDHHmm', timeZone).utc();
    logger.debug(`Parsed expiration time: ${expiresAt.format()}`);
  } else {
    const expiresInMatch = forecast.match(/SUPERSEDED BY NEXT ISSUANCE IN (\d+) HOURS/);
    if (expiresInMatch) {
      const expiresInHours = parseInt(expiresInMatch[1]);
      expiresAt = moment().tz(timeZone).add(expiresInHours, 'hours').utc();
      logger.debug(`Expiration set to ${expiresInHours} hours from now`);
    } else {
      logger.warn(`Expiry time not found in the forecast. Using default expiry time of 6 hours.`);
      expiresAt = moment().tz(timeZone).add(6, 'hours').utc();
    }
  }

  if (!expiresAt.isValid()) {
    throw new Error(`Invalid expiration date: ${expiresAt.format()}`);
  }

  const now = moment().utc();
  if (expiresAt.isBefore(now)) {
    logger.warn(`Calculated expiration time is in the past. Adjusting to 1 hour from now.`);
    expiresAt = moment(now).add(1, 'hour');
  }

  logger.info(`Final expiration time (UTC): ${expiresAt.format()}`);
  return expiresAt.toDate();
}

export {
  getLocalTimeForZone,
  getMarineZones,
  getMarineZonesByGPS,
  getPointForecasts,
  getForecastExpirationTime,
  forecastCollection,
  Forecast
};
