const jackrabbit = require('@pager/jackrabbit');
const path = require('path');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const { createLogger, nws } = require('../shared/module');

const logger = createLogger(
  'nws-forecast-service',
  process.env.LOGSTASH_PORT || 5044
);

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

const rabbit = jackrabbit(process.env.RABBITMQ_URL);
var exchange = rabbit.default();

async function saveForecast(zone, zoneType, forecastText) {
  try {
    const timeZone = await nws.getLocalTimeForZone(zone['ID'], zoneType);
    const expirationTime = nws.getForecastExpirationTime(
      forecastText,
      timeZone
    );

    const forecast = new nws.Forecast({
      zoneId: zone['ID'],
      zoneType: zoneType,
      forecast: forecastText,
      timeZone: timeZone,      
      expires: expirationTime, // purposfully not using expiresAt.  We need to control deleting the document ourselves.
    });

    await forecast.save();

    // TODO not sure that we need to publish updates when we are initially saving the forecast
    // exchange.publish({ zoneId: forecast.zoneId }, { key: 'forecast_update' });

    logger.info(`Forecast for zone ${zone['ID']} saved successfully`);
  } catch (error) {
    logger.error(`Error saving forecast for zone ${zone['ID']}:`, error);
  }
}

async function updateExpiredForecasts() {
  try {
    const expiredForecasts = await nws.Forecast.find({ expires: { $lt: new Date() } });
    for (const expiredForecast of expiredForecasts) {
      await updateForecastIfNecessary(expiredForecast);
    }
  } catch (error) {
    logger.error(`Error updating expired forecasts:`, error);
  }
}

async function updateForecastIfNecessary(expiredForecast) {
  const fetchForecastFunction = expiredForecast.zoneType === 'high_seas' ? fetchHighSeasForecast : fetchForecast;
  const newForecast = await fetchForecastFunction(expiredForecast.zoneId, expiredForecast.zoneType);
  try {
    const newForecastExpiration = nws.getForecastExpirationTime(newForecast, expiredForecast.timeZone);
    await processNewForecast(expiredForecast, newForecast, newForecastExpiration);
  } catch (error) {
    handleForecastExpirationError(expiredForecast, error);
  }
}

async function processNewForecast(expiredForecast, newForecast, newForecastExpiration) {
  if (newForecastExpiration > expiredForecast.expires) {
    expiredForecast.forecast = newForecast;
    expiredForecast.expires = newForecastExpiration;
    await expiredForecast.save();
    exchange.publish({ zoneId: expiredForecast.zoneId }, { key: 'forecast_update' });
    logger.info(`Forecast for zone ${expiredForecast.zoneId} updated successfully`);
  } else {
    logger.info(`New forecast for zone ${expiredForecast.zoneId} is not updated as its expiration is not greater than the current forecast`);
  }
}

async function handleForecastExpirationError(forecast, error) {
  logger.error(`Failed to get valid expiration time for forecast of zone ${forecast.zoneId}: ${error}`);
  logger.info(`Deleting forecast for zone ${forecast.zoneId} due to invalid expiration time.`);
  await nws.Forecast.deleteOne({ _id: forecast._id });
}

zoneIdsWithNoForecast = [];
async function fetchAndSaveForecast(zone, zoneType) {
  try {
    if (zoneType === 'coastal' || zoneType === 'offshore') {
      const forecast = await fetchForecast(zone['ID'], zoneType);
      await saveForecast(zone, zoneType, forecast);
    } else if (zoneType === 'high_seas') {
      const forecast = await fetchHighSeasForecast(zone['ID']);
      await saveForecast(zone, zoneType, forecast);
    }
  } catch (error) {
    logger.error(
      `Unable to fetch and save forecast for zoneid ${zone['ID']} and zonetype ${zoneType}: ${error.message}`
    );
    zoneIdsWithNoForecast.push(zone['ID']);
  }
}

async function fetchAndSaveAllForecasts() {
  const zones = await nws.getMarineZones();
  for (const zoneType in zones) {
    for (const zoneId in zones[zoneType]) {
      // skipZoneIds are zones that exist in the spacefile but do not have forecast (404).
      // TODO on occassian we need to check these zones to see if perhaps they exist, however
      // if anyone wants one of these zones it will be checked by the point forecast and then added to the db... so maybe it doesnt matter
      // TODO are these high_seas zones actually not returning a forecast?  Need to make sure this is accurate
      const skipZoneIds = [
        'PZZ576',
        'PZZ530',
        'PZZ531',
        'LMZ779',
        'LMZ080',
        'LMZ777',
        'LMZ878',
        'LMZ675',
        'LMZ876',
        'LMZ673',
        'LMZ671',
        'LMZ669',
        'LMZ870',
        'LMZ845',
        'LMZ846',
        'LMZ847',
        'LMZ745',
        'LMZ043',
        'LMZ744',
        'LHZ442',
        'LCZ460',
        'LHZ443',
        'LCZ422',
        'LOZ030',
        'LSZ144',
        'LSZ145',
        'LSZ143',
        'LSZ142',
        'LSZ141',
        'LSZ140',
        'LSZ146',
        'LSZ147',
        'LSZ121',
        'LSZ148',
        'LSZ162',
        'LSZ240',
        'LSZ241',
        'PZZ570',
        'PZZ475',
        'PZZ450',
        'PZZ415',
        'PZZ470',
        'PZZ376',
        'PZZ370',
        'PZZ176',
        'PZZ173',
        'PZZ210',
        'PZZ350',
        'PZZ545',
        'PZZ540',
        'PZZ455',
        'PZZ170',
        'PZZ130',
        'PZZ131',
        'PZZ135',
        'PZZ156',
        'PZZ150',
        'LSZ245',
        'LSZ246',
        'LSZ247',
        'LSZ248',
        'LSZ249',
        'LSZ250',
        'LSZ251',
        'LSZ265',
        'LMZ522',
        'LMZ521',
        'LMZ221',
        'LMZ541',
        'LMZ250',
        'LSZ321',
        'LSZ322',
        'LMZ248',
        'LHZ346',
        'LMZ341',
        'LHZ361',
        'LHZ347',
        'LHZ345',
        'LMZ323',
        'LMZ364',
        'LMZ362',
        'LMZ344',
        'LMZ342',
        'LSZ266',
        'LSZ267',
        'LMZ643',
        'LMZ543',
        'LMZ542',
        'LMZ346',
        'LCZ423',
        'LEZ444',
        'LEZ142',
        'LEZ163',
        'LEZ143',
        'LEZ144',
        'LEZ145',
        'LEZ146',
        'LMZ567',
        'LMZ868',
        'LMZ565',
        'LMZ366',
        'LMZ563',
        'LMZ046',
        'LMZ844',
        'LMZ743',
        'LMZ742',
        'LMZ741',
        'LMZ740',
        'LMZ646',
        'LMZ645',
        'LMZ644',
        'LHZ348',
        'LHZ349',
        'LHZ421',
        'LHZ422',
        'LHZ363',
        'LHZ441',
        'LHZ462',
        'LMZ261',
        'LHZ362',
        'LHZ463',
        'LEZ147',
        'LEZ148',
        'LEZ149',
        'LEZ040',
        'LOZ043',
        'LOZ044',
        'LHZ464',
        'LEZ162',
        'LEZ164',
        'LEZ165',
        'LEZ166',
        'LEZ167',
        'LEZ041',
        'LEZ020',
        'SLZ024',
        'LOZ045',
        'LEZ168',
        'LEZ169',
        'LEZ061',
        'LOZ042',
        'LOZ062',
        'LOZ063',
        'LOZ064',
        'LOZ065',
        'LMZ849',
        'LMZ848',
        'LMZ345',
        'LSZ242',
        'LSZ243',
        'LSZ244',
        'LMZ874',
        'LMZ872',
        'PZZ565',
        'PZZ560',
        'PZZ535',
        'PZZ650',
        'PZZ673',
        'PZZ645',
        'PZZ110',
        'PZZ153',
        'PZZ655',
        'PZZ132',
        'PZZ134',
        'PZZ133',
        'PZZ676',
        'PZZ750',
        'PZZ775',
        'PZZ575',
        'PZZ571',
        'PZZ670',
        'LSZ263',
        'LSZ264',
        'PZZ356',
        'PZZ410',
        'SLZ022',
        'LSZ150',
        'AMZ178',
        'AMZ170',
        'AMZ172',
        'AMZ174',
        'AMZ176',
        'ANZ676',
        'ANZ670',
        'ANZ672',
        'ANZ674',
        'ANZ678',
        'ANZ370',
        'ANZ475',
        'ANZ373',
        'ANZ375',
        'ANZ470',
        'ANZ471',
        'ANZ472',
        'ANZ473',
        'ANZ172',
        'ANZ271',
        'ANZ070',
        'ANZ273',
        'ANZ272',
        'ANZ270',
        'ANZ071',
        'ANZ170',
        'ANZ174',
        'PMZ191',
        'AMZ270',
        'AMZ272',
        'AMZ370',
        'AMZ274',
        'AMZ276',
        'AMZ372',
        'PZZ271',
        'PZZ251',
        'PZZ253',
        'PZZ252',
        'PZZ273',
        'PZZ272',
        'PZZ900',
        'PZZ915',
        'PZZ920',
        'PZZ930',
        'PZZ940',
        'PZZ840',
        'PZZ835',
        'PZZ935',
        'PZZ800',
        'PZZ905',
        'PZZ805',
        'PZZ910',
        'PZZ810',
        'PZZ815',
        'PZZ820',
        'PZZ925',
        'PZZ825',
        'PZZ830',
        'PZZ945',
        //'North Atlantic Ocean between 31N and 67N latitude and between the East Coast North America and 35W longitude','Atlantic Ocean West of 35W longitude between 31N latitude and 7N latitude .  This includes the Caribbean and the Gulf of Mexico','Central South Pacific Ocean between the Equator and 25S latitude and between 120W longitude and 160E longitude','Eastern North Pacific Ocean between the Equator and 30N latitude and east of 140W longitude and 3.4S to Equator east of 120W longitude','Central North Pacific Ocean between the Equator and 30N latitude and between 140W longitude and 160E longitude','North Pacific Ocean between 30N and the Bering Strait and between the West Coast of North America and 160E Longitude'
      ];
      if (skipZoneIds.includes(zoneId)) {
        continue;
      }
      let existingForecast;
      try {
        existingForecast = await nws.Forecast.findOne({ zoneId: zoneId });
      } catch (error) {
        logger.error(`Error fetching existing forecast for zoneId ${zoneId}: ${error}`);
        continue;
      }
      if (!existingForecast) {
        await fetchAndSaveForecast(zones[zoneType][zoneId], zoneType);
      } else if (existingForecast.expires < new Date()) {
        await nws.Forecast.deleteOne({ _id: existingForecast._id });
        await fetchAndSaveForecast(zones[zoneType][zoneId], zoneType);
      } else {
        logger.info(
          `Skipping forecast for ${zoneType} zone ${zoneId} as it already exists in the database`
        );
      }
    }
  }

  logger.info(`Zone IDs with no forecast: ${zoneIdsWithNoForecast}`);
}

async function fetchForecast(id, zoneType) {
  logger.info(`Function fetchForecast called at: ${new Date().toISOString()}`);
  id = id.toLowerCase();
  const zoneRegion = id.split('z')[0].toLowerCase();
  zoneType = zoneType.toLowerCase();

  const zoneTextForecastURL = `https://tgftp.nws.noaa.gov/data/forecasts/marine/${zoneType}/${zoneRegion}/${id}.txt`;
  logger.info(`Fetching forecast from: ${zoneTextForecastURL}`);

  const response = await fetch(zoneTextForecastURL);
  if (!response.ok) {
    throw new Error(
      `Error fetching the zone text forecast: ${response.status} ${response.statusText}`
    );
  }
  const forecastText = await response.text();

  return forecastText;
}

async function fetchHighSeasForecast(zoneName) {
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

  const forecastUrl = zoneNameToForecastUrlMap[zoneName];
  if (!forecastUrl) {
    throw new Error(`No forecast URL found for ${zoneName}`);
  }

  try {
    const response = await fetch(forecastUrl);
    if (!response.ok) {
      throw new Error(
        `Error fetching the zone text forecast: ${response.status} ${response.statusText}`
      );
    }
    return await response.text();
  } catch (error) {
    logger.error(`Error in getHighSeasMarineTextForecast: ${error.message}`);
    throw error;
  }
}

async function initializeApp() {
  try {
    fetchAndSaveAllForecasts();

    setInterval(updateExpiredForecasts, 5 * 60 * 1000);

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Error initializing application:', error);
  }
}

if (require.main === module) {
  initializeApp();
}

module.exports = {
  initializeApp,
  fetchAndSaveAllForecasts,
  updateExpiredForecasts,
};
