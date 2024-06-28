process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

import jackrabbit from '@pager/jackrabbit';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createLogger, nws } from '../shared/module/index.mjs';

import moment from 'moment-timezone';

// Initialize logger
const logger = createLogger('nws-forecast-service', process.env.LOGSTASH_PORT || 5044);

// Load environment variables
dotenv.config({
  path: path.resolve(process.cwd(), process.env.NODE_ENV?.toUpperCase() === 'TEST' ? '.env.test' : '.env'),
});

// Initialize RabbitMQ
const rabbit = jackrabbit(process.env.RABBITMQ_URL);
const exchange = rabbit.default();

// Constants
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_EXPIRATION_HOURS = 6;

// Forecast fetching functions
async function fetchForecast(id, zoneType) {
  logger.info(`Fetching forecast for ${zoneType} zone ${id}`);
  id = id.toLowerCase();
  const zoneRegion = id.split('z')[0].toLowerCase();
  zoneType = zoneType.toLowerCase();

  const url = `https://tgftp.nws.noaa.gov/data/forecasts/marine/${zoneType}/${zoneRegion}/${id}.txt`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error fetching forecast: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function fetchHighSeasForecast(zoneName) {
  const urlMap = {
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

  const url = urlMap[zoneName];
  if (!url) throw new Error(`No forecast URL found for ${zoneName}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error fetching high seas forecast: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

// Forecast processing functions
function getForecastExpirationTime(forecastText, timeZone) {
  let expiresAt;

  const expiresMatch = forecastText.match(/Expires:(\d{12})/);
  if (expiresMatch) {
    expiresAt = moment.tz(expiresMatch[1], 'YYYYMMDDHHmm', timeZone);
  } else {
    const supersededMatch = forecastText.match(/SUPERSEDED BY NEXT ISSUANCE IN (\d+) HOURS/);
    if (supersededMatch) {
      expiresAt = moment().tz(timeZone).add(parseInt(supersededMatch[1]), 'hours');
    } else {
      expiresAt = moment().tz(timeZone).add(DEFAULT_EXPIRATION_HOURS, 'hours');
      logger.warn('Expiry time not found in forecast. Using default.');
    }
  }

  if (!expiresAt.isValid()) {
    throw new Error('Invalid expiration time calculated');
  }

  return expiresAt.toDate();
}

async function saveForecast(zone, zoneType, forecastText) {
  const timeZone = await nws.getLocalTimeForZone(zone['ID'], zoneType);
  const expirationTime = getForecastExpirationTime(forecastText, timeZone);

  const forecast = new nws.Forecast({
    zoneId: zone['ID'],
    zoneType,
    forecast: forecastText,
    timeZone,
    expires: expirationTime,
  });

  await forecast.save();
  logger.info(`Forecast for zone ${zone['ID']} saved successfully`);
}

async function updateForecast(forecast) {
  const fetchFunc = forecast.zoneType === 'high_seas' ? fetchHighSeasForecast : fetchForecast;
  try {
    const newForecastText = await fetchFunc(forecast.zoneId, forecast.zoneType);
    const newExpirationTime = getForecastExpirationTime(newForecastText, forecast.timeZone);

    if (newExpirationTime > forecast.expires) {
      forecast.forecast = newForecastText;
      forecast.expires = newExpirationTime;
      await forecast.save();
      exchange.publish({ zoneId: forecast.zoneId }, { key: 'forecast_update' });
      logger.info(`Forecast for zone ${forecast.zoneId} updated successfully`);
    } else {
      logger.info(`No update needed for zone ${forecast.zoneId}`);
    }
  } catch (error) {
    logger.error(`Error updating forecast for zone ${forecast.zoneId}:`, error);
    if (error.message.includes('Invalid expiration time')) {
      await nws.Forecast.deleteOne({ _id: forecast._id });
      logger.info(`Deleted invalid forecast for zone ${forecast.zoneId}`);
    }
  }
}

// Main functions
async function updateForecasts() {
  const now = new Date();
  const forecasts = await nws.Forecast.find({ expires: { $lt: now } });
  logger.info(`Updating ${forecasts.length} expired forecasts`);
  
  for (const forecast of forecasts) {
    await updateForecast(forecast);
  }
}

async function initializeForecasts() {
  const zones = await nws.getMarineZones();
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


  for (const [zoneType, zoneMap] of Object.entries(zones)) {
    for (const [zoneId, zone] of Object.entries(zoneMap)) {
      if (skipZoneIds.includes(zoneId)) continue;

      try {
        const existingForecast = await nws.Forecast.findOne({ zoneId });
        if (!existingForecast || existingForecast.expires < new Date()) {
          if (existingForecast) await nws.Forecast.deleteOne({ _id: existingForecast._id });
          
          const fetchFunc = zoneType === 'high_seas' ? fetchHighSeasForecast : fetchForecast;
          const forecastText = await fetchFunc(zoneId, zoneType);
          await saveForecast(zone, zoneType, forecastText);
        } else {
          logger.info(`Skipping forecast for ${zoneType} zone ${zoneId} (not expired)`);
        }
      } catch (error) {
        logger.error(`Error processing forecast for zone ${zoneId}:`, error);
      }
    }
  }
}

async function initializeApp() {
  try {
    await initializeForecasts();
    setInterval(updateForecasts, UPDATE_INTERVAL);

    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Error initializing application:', error);
    process.exit(1);
  }
}


export { initializeApp, updateForecasts }; 
