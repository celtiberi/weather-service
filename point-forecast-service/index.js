const http = require('http');
const url = require('url');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path')
const RABBITMQ_URL = 'amqp://admin:password@localhost:5672';
const fs = require('fs');
const shapefile = require('shapefile');
const turf = require('@turf/turf');

const coastal_marine_zones_shapeFile = path.join(__dirname, 'geodata', 'mz05mr24.shp');
const coastal_marine_zones_dbfFile = path.join(__dirname, 'geodata', 'mz05mr24.dbf');
const offshore_marine_zones_shapeFile = path.join(__dirname, 'geodata', 'oz05mr24.shp');
const offshore_marine_zones_dbfFile = path.join(__dirname, 'geodata', 'oz05mr24.dbf');
const high_seas_marine_zones_shapeFile = path.join(__dirname, 'geodata', 'hz30jn17.shp');
const high_seas_marine_zones_dbfFile = path.join(__dirname, 'geodata', 'hz30jn17.dbf');

// files take a while to load the first time
const coastalGeojsonPromise = shapefile.read(coastal_marine_zones_shapeFile, coastal_marine_zones_dbfFile);
const offshoreGeojsonPromise = shapefile.read(offshore_marine_zones_shapeFile, offshore_marine_zones_dbfFile);
const highSeasGeojsonPromise = shapefile.read(high_seas_marine_zones_shapeFile, high_seas_marine_zones_dbfFile);


// create function getMarineTextForecastByZone(id, name)
// the zoneID is a string (e.g. ANZ898) the Z splits the zone name
// into to parts.  The first part (e.g AN) is the zone region
// and the second part is the zone number (e.g. 898)
// the function will return the zone text forecast for the zone
// based on the zone region and the zone number. The forecast is downloaded
// from https://tgftp.nws.noaa.gov/data/forecasts/marine/<coastal|offshore>/<zone region>/<id>.txt
// From the zone name you will have to determine if the zone is coastal, offshore or high seas
// by searching for those terms in the name
async function getMarineTextForecastByZone(id, zoneName)
{
  const zoneRegion = id.split('Z')[0].toLowerCase();
  id = id.toLowerCase();
  
  let marineType;
  if (zoneName.toLowerCase().includes("coastal")) {
    marineType = "coastal";
  } else if (zoneName.toLowerCase().includes("offshore")) {
    marineType = "offshore";
  } else if (zoneName.toLowerCase().includes("high seas") || zoneName.toLowerCase().includes("high_seas")) {
    marineType = "high_seas";
  } else {
    throw new Error("Unable to determine marine zone type from name");
  }
  marineType = marineType.toLowerCase();

  const zoneTextForecastURL = `https://tgftp.nws.noaa.gov/data/forecasts/marine/${marineType}/${zoneRegion}/${id}.txt`; 
  const response = await fetch(zoneTextForecastURL);
  if (!response.ok) {
    throw new Error(`Error fetching the zone text forecast: ${response.status} ${response.statusText}`);
  }
  const zoneTextForecast = await response.text();
  return zoneTextForecast;
}


async function getMarineZoneIdentifier(lat, lon) {
  
  const coastalGeojson = await coastalGeojsonPromise;
  const offshoreGeojson = await offshoreGeojsonPromise;
  const highSeasGeojson = await highSeasGeojsonPromise;
  // TODO The shape and db files comes from https://www.weather.gov/gis/MarineZones
  // They will need to be checked periodicaly for updates.  Maybe be best to create
  // a service that take care of this.  Keey the files in a shared volume

  const point = turf.point([lon, lat]);

  // Filter the matching zones from each shapefile
  const matchingZones = [
    ...coastalGeojson.features.filter(feature => turf.booleanPointInPolygon(point, feature.geometry)),
    ...offshoreGeojson.features.filter(feature => turf.booleanPointInPolygon(point, feature.geometry)),
    ...highSeasGeojson.features.filter(feature => turf.booleanPointInPolygon(point, feature.geometry))
  ];

  if (matchingZones.length > 2) {
    throw new Error('More than two matching zones found');
  }
  
  const id = matchingZones.find(zone => zone.properties.ID !== null)?.properties.ID;
  const name = matchingZones.find(zone => zone.properties.NAME !== null)?.properties.NAME;
  
  console.log(`matching zone ID: ${id}`);
  console.log(`matching zone Name: ${name}`);
  
  return { id, name };
}

function getPointForecast(lat, lon) {
  return new Promise((resolve, reject) => {
    const params = new url.URLSearchParams({
      lat: lat,
      lon: lon
    });

    const options = {
      hostname: 'forecast.weather.gov',
      path: `/MapClick.php?${params.toString()}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function onRequest(data, reply) {
    const { lat, lon } = data;

    try {
      const forecast = await getPointForecast(lat, lon);
      const processedForecast = processPointForecastData(forecast);
      reply(processedForecast);
    } catch (error) {
      console.error('Error getting point forecast:', error);
      reply({ error: 'Failed to get point forecast' }); //TODO need en error object and type
    }
}

function processPointForecastData(data) {
// Parse the HTML data and extract the relevant forecast information
// Return the processed data as an object
// Example:
// const processedData = {
//   location: 'New York, NY',
//   forecast: 'Partly cloudy with a high of 25°C',
//   temperature: 25,
//   // ...
// };
// return processedData;

// Placeholder implementation
return {
    rawData: data,
    // Add other processed data properties as needed
};
}

(async () => {
  const rabbit = jackrabbit(RABBITMQ_URL);
  const exchange = rabbit.default();
  const rpc = exchange.queue({ name: 'point_forecast', prefetch: 1, durable: true });
  rpc.consume(onRequest);
  console.log('point-forecast-service is listening for messages...');
})();


// For debug mode testing, call getMarineZoneIdentifier with example coordinates
if (process.env.DEBUG) {
  coastalGeojsonPromise.then(coastalGeojson => {
    offshoreGeojsonPromise.then(offshoreGeojson => {
      highSeasGeojsonPromise.then(highSeasGeojson => {
        
        zones = getMarineZoneIdentifier(44.551, -67.830)  // south east of cuba open waters        
          .then(result =>
            {
              // returns {id, name}
              getMarineTextForecastByZone(result.id, result.name)
              .then( result => {
                console.log(result);
              })
              
            }) // point near key west
      });
    });
  });
  
  
  
}


// Forcast that will match the name/id of a zone
//  https://www.weather.gov/marine/atlantictext
//  https://www.weather.gov/marine/pacifictext