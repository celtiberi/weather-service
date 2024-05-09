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

console.log('Connecting to MongoDB...' + process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI);

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
  expires: {
    type: Date,
    required: true,
  },
},
{ collectionOptions: { changeStreamPreAndPostImages: { enabled: true } } }
);

// Create the forecast model
const Forecast = mongoose.model('Forecast', forecastSchema);

// Get the Forecast collection
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

async function getMarineZones() {
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

    return {
      coastal: coastalZones,
      offshore: offshoreZones,
      high_seas: highSeasZones,
    };
  }).catch((error) => {
    console.error('Error getting marine zones:', error);
    throw error;
  });
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
  const zones = await getMarineZones(lat, lon);
  let coastalForecast = null;
  let offshoreForecast = null;
  let highSeasForecast = null;

  if (zones.coastal) {
    const forecast = await Forecast.findOne({ zoneId: zones.coastal.id });
    if (forecast) {
      coastalForecast = forecast.forecast;
    } else {
      throw new Error('No forecast found for the coastal zone');
    }
  }
  npm;

  if (zones.offshore) {
    const forecast = await Forecast.findOne({ zoneId: zones.offshore.id });
    if (forecast) {
      offshoreForecast = forecast.forecast;
    } else {
      throw new Error('No forecast found for the offshore zone');
    }
  }

  if (zones.high_seas) {
    const forecast = await Forecast.findOne({ zoneId: zones.high_seas.name });
    if (forecast) {
      highSeasForecast = forecast.forecast;
    } else {
      throw new Error('No forecast found for the high seas zone');
    }
  }

  return {
    coastal: coastalForecast,
    offshore: offshoreForecast,
    high_seas: highSeasForecast,
  };
}


function getForecastExpirationTime(forecast) {
  let issuedAt = new Date();
  let expiresAt = new Date(issuedAt);
  expiresAt.setHours(expiresAt.getHours() + 6); // Default expiry time of 6 hours

  const issuedAtMatch = forecast.match(
    /(?<time>\d{4})\s+UTC\s+(?<dayOfWeek>\w{3})\s+(?<month>\w{3})\s+(?<day>\d{1,2})\s+(?<year>\d{4})/
  );

  if (issuedAtMatch) {
    const { time, dayOfWeek, month, day, year } = issuedAtMatch.groups;
    // Extract hours and minutes from the time string
    const [hours, minutes] = time.match(/(\d{2})(\d{2})/).slice(1);

    // Create a date string in a format recognized by Date.parse()
    const parsableDate = `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:00 UTC`;

    // Create a new Date object
    const issuedAt = new Date(Date.parse(parsableDate));

    expiresAt = new Date(issuedAt);
    expiresAt.setHours(expiresAt.getHours() + 6); // Default expiry time of 6 hours
  } else {
    console.log(
      'Issue time not found in the forecast. Using current time as default.'
    );
  }

  const expiresInMatch = forecast.match(
    /SUPERSEDED BY NEXT ISSUANCE IN (\d+) HOURS/
  );
  if (expiresInMatch) {
    const expiresInHours = parseInt(expiresInMatch[1]);
    expiresAt = new Date(issuedAt);
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
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
      expiresAt = new Date(
          expiresAtYear,
          expiresAtMonth,
          expiresAtDay,
          expiresAtHour,
          expiresAtMinute
      );
    } else {
      console.log(
        'Expiry time not found in the forecast. Using default expiry time of 6 hours.'
      );
    }
  }

  if (!issuedAt || !expiresAt) {
    throw new Error(
      `issuedAt: ${issuedAt}, expiresAt: ${expiresAt}, forecast: ${forecast}`
    );
  }
  let now = new Date()
  
  // TODO maybe this check should be done at a higher level?  WOuld probaably make more sense
  if (expiresAt < issuedAt || (now - expiresAt) > 24 * 60 * 60 * 1000) {
    // This is a stale forecast.  It may not be updated again for quite a while
    // There is no reason to store this forecast in the database
    
    throw new Error('Stale forecast. This forecast should be ignored.');
  }

  return expiresAt;
}

module.exports = {
  mongooseConnectionPromise,
  getMarineZones,
  getMarineZonesByGPS,
  getPointForecasts,
  getForecastExpirationTime,
  forecastCollection: forecastCollection,
  Forecast: Forecast
};
