const shapefile = require('shapefile');
const turf = require('@turf/turf');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const tzlookup = require("tz-lookup");
const moment = require('moment-timezone');

console.log("Attempting to connect to MongoDB...");
//const mongodbUri = 'mongodb+srv://admin:ay5HG8TYzT0MMsTx@cluster0.ml7brdd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
 const mongodbUri = 'mongodb://mongodb:27017/ocean';
//const mongodbUri = 'mongodb://127.0.0.1:27017/ocean';
mongoose.connect(mongodbUri)
.then(() => {
  console.log('Mongoose connected to MongoDB');
  console.log(`Mongoose connection ready state: ${mongoose.connection.readyState}`);
})
.catch((err) => {
  console.error('Mongoose connection error:', err);
  process.exit(1);
});

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
  },
});

// Create the forecast model
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

// timeZone will be somethign like "America/Nassau"
function getForecastExpirationTime(forecast, timeZone) {
  let issuedAt = moment().tz(timeZone);
  let expiresAt = moment(issuedAt).add(6, 'hours');

  const issuedAtMatch = forecast.match(/(?<time>\d{4})\s+UTC\s+(?<dayOfWeek>\w{3})\s+(?<month>\w{3})\s+(?<day>\d{1,2})\s+(?<year>\d{4})/);
  if (issuedAtMatch) {
    const { time, dayOfWeek, month, day, year } = issuedAtMatch.groups;
    const [hours, minutes] = time.match(/(\d{2})(\d{2})/).slice(1);
    issuedAt = moment.tz(`${year}-${month}-${day} ${hours}:${minutes}`, 'YYYY-MMM-DD HH:mm', 'UTC').tz(timeZone);
    expiresAt = moment(issuedAt).add(6, 'hours');
  } else {
    console.log('Issue time not found in the forecast. Using current time as default.');
  }

  const expiresInMatch = forecast.match(/SUPERSEDED BY NEXT ISSUANCE IN (\d+) HOURS/);
  if (expiresInMatch) {
    const expiresInHours = parseInt(expiresInMatch[1]);
    expiresAt = moment(issuedAt).add(expiresInHours, 'hours');
  } else {
    const expiresAtMatch = forecast.match(/Expires:(\d{12})/);
    if (expiresAtMatch) {
      const expiresAtString = expiresAtMatch[1];
      const expiresAtYear = parseInt(expiresAtString.slice(0, 4));
      const expiresAtMonth = parseInt(expiresAtString.slice(4, 6)) - 1;
      const expiresAtDay = parseInt(expiresAtString.slice(6, 8));
      const expiresAtHour = parseInt(expiresAtString.slice(8, 10));
      const expiresAtMinute = parseInt(expiresAtString.slice(10, 12));
      console.log(`Expiry time: ${expiresAtYear}-${expiresAtMonth + 1}-${expiresAtDay} ${expiresAtHour}:${expiresAtMinute}`);
      expiresAt = moment.tz(`${expiresAtYear}-${expiresAtMonth + 1}-${expiresAtDay} ${expiresAtHour}:${expiresAtMinute}`, 'YYYY-M-D HH:mm', timeZone);
    } else {
      console.log('Expiry time not found in the forecast. Using default expiry time of 6 hours.');
    }
  }

  if (!issuedAt.isValid() || !expiresAt.isValid()) {
    throw new Error(`issuedAt: ${issuedAt}, expiresAt: ${expiresAt}, forecast: ${forecast}`);
  }

  const now = moment().tz(timeZone);
  if (expiresAt.isBefore(issuedAt) || now.diff(expiresAt, 'milliseconds') > 24 * 60 * 60 * 1000) {
    throw new Error('Stale forecast. This forecast should be ignored.');
  }

  return expiresAt.toDate();
}

module.exports = {
  getLocalTimeForZone,
  getMarineZones,
  getMarineZonesByGPS,
  getPointForecasts,
  getForecastExpirationTime,
  forecastCollection: forecastCollection,
  Forecast: Forecast
};
