const http = require('http');
const url = require('url');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path');
const fs = require('fs');
const shapefile = require('shapefile');
const turf = require('@turf/turf');
const fetch = require('node-fetch');
const {cacheForecast, getForecast: getForecastFromCache} = require('./forecastCache.js');

const dotenv = require('dotenv');
const getDotEnvPath = (env) => {
  if (env === 'TEST') {
    return '.env.test';
  }
  return '.env';
};

dotenv.config({ path: path.resolve(process.cwd(), getDotEnvPath(process.env.NODE_ENV?.toUpperCase())) });

const createLogger = require('weather-service-shared');
const logger = createLogger('point-forecast-service', process.env.LOGSTASH_PORT || 5044);

logger.info(`RABBITMQ_URL: ${process.env.RABBITMQ_URL}`);


// Define paths for marine zone shapefiles and dbf files
// Files come from https://www.weather.gov/gis/MarineZones
const coastalMarineZonesShapeFile = path.join(__dirname, 'geodata', 'mz05mr24.shp');
const coastalMarineZonesDbfFile = path.join(__dirname, 'geodata', 'mz05mr24.dbf');
const offshoreMarineZonesShapeFile = path.join(__dirname, 'geodata', 'oz05mr24.shp');
const offshoreMarineZonesDbfFile = path.join(__dirname, 'geodata', 'oz05mr24.dbf');
const highSeasMarineZonesShapeFile = path.join(__dirname, 'geodata', 'hz30jn17.shp');
const highSeasMarineZonesDbfFile = path.join(__dirname, 'geodata', 'hz30jn17.dbf');

// Load shapefiles asynchronously as they may take time to load initially
const coastalGeojsonPromise = shapefile
  .read(coastalMarineZonesShapeFile, coastalMarineZonesDbfFile)
  .catch((err) => {
    logger.error('Error loading coastal marine zones shapefile:', err);
    throw err;
  });
const offshoreGeojsonPromise = shapefile
  .read(offshoreMarineZonesShapeFile, offshoreMarineZonesDbfFile)
  .catch((err) => {
    logger.error('Error loading offshore marine zones shapefile:', err);
    throw err;
  });
const highSeasGeojsonPromise = shapefile
  .read(highSeasMarineZonesShapeFile, highSeasMarineZonesDbfFile)
  .catch((err) => {
    logger.error('Error loading high seas marine zones shapefile:', err);
    throw err;
  });

// Fetch marine text forecast by zone ID and name
async function fetchForecast(id, zoneName, zoneType) {
  logger.info(`Function getForecast called at: ${new Date().toISOString()}`);
  id = id.toLowerCase();
  const zoneRegion = id.split('z')[0].toLowerCase();
  zoneType = zoneType.toLowerCase();

  // Construct URL for fetching the text forecast
  const zoneTextForecastURL = `https://tgftp.nws.noaa.gov/data/forecasts/marine/${zoneType}/${zoneRegion}/${id}.txt`;
  logger.info(`Fetching forecast from: ${zoneTextForecastURL}`);

  try {
    const response = await fetch(zoneTextForecastURL);
    if (!response.ok) {
      throw new Error(`Error fetching the zone text forecast: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    logger.info(`Function getForecast exited at: ${new Date().toISOString()}`);
    return text;
  } catch (error) {
    logger.error(`Error in getForecast: ${error.message}`);
    throw error;
  }
}

async function getCoastalMarineTextForecast(coastalZone) {
  return await fetchForecast(coastalZone.id, coastalZone.name, 'coastal');
}

async function getOffshoreMarineTextForecast(offshoreZone) {
  return await fetchForecast(offshoreZone.id, offshoreZone.name, 'offshore');
}

async function getHighSeasMarineTextForecast(highSeasZone) {
  const zoneNameToForecastUrlMap = {
    'North Atlantic Ocean between 31N and 67N latitude and between the East Coast North America and 35W longitude':
      'https://tgftp.nws.noaa.gov/data/raw/fz/fznt01.kwbc.hsf.at1.txt',

    'Atlantic Ocean West of 35W longitude between 31N latitude and 7N latitude .  This includes the Caribbean and the Gulf of Mexico':
      'https://tgftp.nws.noaa.gov/data/raw/fz/fznt02.knhc.hsf.at2.txt',

    'North Pacific Ocean between 30N and the Bering Strait and between the West Coast of North America and 160E Longitude':
      'https://tgftp.nws.noaa.gov/data/raw/fz/fzpn02.kwbc.hsf.epi.txt',

    'Central North Pacific Ocean between the Equator and 30N latitude and between 140W longitude and 160E longitude':
      'https://tgftp.nws.noaa.gov/data/raw/fz/fzpn40.phfo.hsf.np.txt',

    'Eastern North Pacific Ocean between the Equator and 30N latitude and east of 140W longitude and 3.4S to Equator east of 120W longitude':
      'https://tgftp.nws.noaa.gov/data/raw/fz/fzpn03.knhc.hsf.ep2.txt',

    'Central South Pacific Ocean between the Equator and 25S latitude and between 120W longitude and 160E longitude':
      'https://tgftp.nws.noaa.gov/data/raw/fz/fzps40.phfo.hsf.sp.txt',
  };

  const forecastUrl = zoneNameToForecastUrlMap[highSeasZone.name];
  if (!forecastUrl) {
    throw new Error(`No forecast URL found for ${highSeasZone.name}`);
  }

  try {
    const response = await fetch(forecastUrl);
    if (!response.ok) {
      throw new Error(`Error fetching the zone text forecast: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    logger.error(`Error in getHighSeasMarineTextForecast: ${error.message}`);
    throw error;
  }
}

// Identify marine zone based on latitude and longitude
async function getMarineZones(lat, lon) {
  // Await loading of geojson data for each marine zone type
  const coastalGeojson = await coastalGeojsonPromise;
  const offshoreGeojson = await offshoreGeojsonPromise;
  const highSeasGeojson = await highSeasGeojsonPromise;

  // Create a point from the provided latitude and longitude
  const point = turf.point([lon, lat]);

  // Filter matching zones across all marine zone types and include the type of zone
  const coastalZone = coastalGeojson.features.filter(
    (feature) => turf.booleanPointInPolygon(point, feature.geometry)
  )[0];
  const offshoreZone = offshoreGeojson.features.filter(
    (feature) => turf.booleanPointInPolygon(point, feature.geometry)
  )[0];
  const highSeasZone = highSeasGeojson.features.filter(
    (feature) => turf.booleanPointInPolygon(point, feature.geometry)
  )[0];

  const zones = {
    coastal: coastalZone
      ? {
          id: coastalZone.properties.ID,
          name: coastalZone.properties.NAME,
          wfo: coastalZone.properties.WFO,
        }
      : null,
    offshore: offshoreZone
      ? {
          id: offshoreZone.properties.ID,
          name: offshoreZone.properties.NAME,
          wfo: offshoreZone.properties.WFO,
        }
      : null,
    high_seas: {
      // there is not a zone Id for high_seas forecast.  This zone should always be defined or there is an issue
      name: highSeasZone?.properties.NAME,
      wfo: highSeasZone?.properties.WFO,
    },
  };

  if (!zones.coastal && !zones.offshore && !zones.high_seas.name) {
    throw new Error(`No forecast found for lat: ${lat}, lon: ${lon}`);
  }

  return zones;
}

// Fetch point forecast based on latitude and longitude
async function getPointForecasts(lat, lon) {
  const zones = await getMarineZones(lat, lon);
  
  let coastalForecast = null;
  let offshoreForecast = null;
  let highSeasForecast = null;

  try {
    if(zones.coastal) {
      let forecast = getForecastFromCache(zones.coastal.id)
      if(!forecast) {
        forecast = await getCoastalMarineTextForecast(zones.coastal)
        cacheForecast(zones.coastal.id, forecast);
      }
      coastalForecast = forecast
    }

    if(zones.offshore) {
      let forecast = getForecastFromCache(zones.offshore.id)
      if(!forecast) {
        forecast = await getOffshoreMarineTextForecast(zones.offshore)
        cacheForecast(zones.offshore.id, forecast);
      }
      offshoreForecast =forecast
    }

    if(zones.high_seas) {
      let forecast = getForecastFromCache(zones.high_seas.name)
      if(!forecast) {
        forecast = await getHighSeasMarineTextForecast(zones.high_seas)
        cacheForecast(zones.high_seas.name, forecast);
      }
      highSeasForecast = forecast
    }
  } catch (error) {
    console.error(`Error fetching forecast: ${error.message}`);
  }

  return {
    coastal: coastalForecast,
    offshore: offshoreForecast,
    high_seas: highSeasForecast,
  };
}

// Handle incoming requests for point forecasts
async function onRequest(data, reply) {
  logger.info(`onRequest called at: ${new Date().toISOString()}`);

  try {
    if (!data.lat || !data.lon) {
      throw new Error('Latitude and longitude are required');
    }

    const { lat, lon } = data;
    const parsedLat = Number(lat);
    const parsedLon = Number(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      throw new Error('Invalid latitude or longitude');
    }

    const forecasts = await getPointForecasts(parsedLat, parsedLon);

    logger.info(`reply() called at: ${new Date().toISOString()}`);
    reply(forecasts);
  } catch (error) {
    logger.error(`Error in onRequest for lat: ${data.lat}, lon: ${data.lon} - ${error.message}`);
    reply({ error: `Failed to fetch forecast - ${error.message}` });
  }
}

// Initialize RabbitMQ consumer for point forecast requests
module.exports = (async function pointForecastService() {
  const rabbit = jackrabbit(process.env.RABBITMQ_URL);
  const exchange = rabbit.default();
  const rpc_point_forecast_queue = exchange.queue({ name: 'rpc_point_forecast_queue' });
  
  rpc_point_forecast_queue.consume(onRequest);
  
  logger.info('Point-forecast-service is listening for messages...');

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    if (err.message) {
      logger.error('Error message:', err.message);
    }
    if (err.stack) {
      logger.error('Error stack:', err.stack);
    }
    process.exit(1); // This will stop the process and allow Docker to restart it
  });
})();

