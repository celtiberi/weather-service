const axios = require('axios');
const fs = require('fs');
const path = require('path');
const amqp = require('amqplib');

const createLogger = require('weather-service-logger');
const logger = createLogger('grib-downloader', process.env.LOGSTASH_PORT || 5044);

logger.info('Hello, grib-downloader!');

// Example log statement
// logger.info('Hello, Logstash!');

const GRIB_SAVE_PATH = process.env.GRIB_SAVE_PATH || '/app/grib_files';
const NOAA_BASE_URL = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

async function getLatestCycle(formattedDate) {
  const url = `${NOAA_BASE_URL}?dir=%2Fgfs.${formattedDate}`;

  try {
    const response = await axios.get(url);
    const cycles = response.data.match(/(?<=dir=%2Fgfs\.\d{8}%2F)\d{2}/g);

    if (!cycles || cycles.length === 0) {
      throw new Error('No cycles found for the given date.');
    }

    return cycles[cycles.length - 1].split('/').pop();
  } catch (error) {
    throw new Error(`Request to NOAA failed: ${error.message}`);
  }
}

async function downloadGribFile(date, cycle, forecastHour, variables, levels, topLat, leftLon, rightLon, bottomLat) {
  const formattedDate = date.toISOString().slice(0, 10).replace(/-/g, '');
  const latestCycle = cycle || await getLatestCycle(formattedDate);
  const formattedVariables = variables ? variables.join('_') : 'all';
  const formattedLevels = levels ? levels.join('_') : 'all';
  const formattedCoordinates = `${topLat}_${bottomLat}_${leftLon}_${rightLon}`;
  const outputFileName = `gfs_0p25_${formattedDate}_${latestCycle}_f${forecastHour || '000'}_${formattedVariables}_${formattedLevels}_${formattedCoordinates}.grib`;
  const outputFilePath = path.join(GRIB_SAVE_PATH, outputFileName);

  if (fs.existsSync(outputFilePath)) {
    return outputFilePath;
  }

  const queryParams = new URLSearchParams({
    dir: `%2Fgfs.${formattedDate}%2F${latestCycle}%2Fatmos`,
    file: `gfs.t${latestCycle}z.pgrb2.0p25.f${forecastHour || '000'}`,
    subregion: '',
    toplat: topLat,
    leftlon: leftLon,
    rightlon: rightLon,
    bottomlat: bottomLat,
  });

  if (variables) {
    variables.forEach(variable => queryParams.append(`var_${variable}`, 'on'));
  }

  if (levels) {
    levels.forEach(level => queryParams.append(`lev_${level}`, 'on'));
  }

  const url = `${NOAA_BASE_URL}?${queryParams.toString()}`;

  try {
    const response = await axios.get(url, { responseType: 'stream' });
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    const writer = fs.createWriteStream(outputFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`GRIB file downloaded successfully and saved as ${outputFilePath}`);
    return outputFilePath;
  } catch (error) {
    throw new Error(`Error downloading the GRIB file. URL: ${url}, Error: ${error.message}`);
  }
}

async function sendMessageToQueue(message) {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue('grib_updates');
  channel.sendToQueue('grib_updates', Buffer.from(message));
  await channel.close();
  await connection.close();
}

async function checkForNewGribFile() {
  try {
    const currentDate = new Date();
    const gribFilePath = await downloadGribFile(currentDate);
    logger.info(`New GRIB file downloaded: ${gribFilePath}`);
    await sendMessageToQueue(`New GRIB file available: ${gribFilePath}`);
  } catch (error) {
    logger.error(`Failed to check for new GRIB file: ${error.message}`);
  }
}
// Start checking for new GRIB files every hour
setInterval(checkForNewGribFile, 60 * 60 * 1000);

// Initial check for new GRIB file
checkForNewGribFile();
