// For reference: https://davidburchnavigation.blogspot.com/2019/06/how-to-request-grib-files-by-parameter.html

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

logger.info('RABBITMQ_URL=' + process.env.RABBITMQ_URL);
const RABBITMQ_URL = process.env.RABBITMQ_URL;

// Define the available variables and levels
const variables = {
  '4LFTX': 'var_4LFTX',
  ABSV: 'var_ABSV',
  ACPCP: 'var_ACPCP',
  ALBDO: 'var_ALBDO',
  APCP: 'var_APCP',
  CAPE: 'var_CAPE',
  CFRZR: 'var_CFRZR',
  CICEP: 'var_CICEP',
  CIN: 'var_CIN',
  CLWMR: 'var_CLWMR',
  CNWAT: 'var_CNWAT',
  CPOFP: 'var_CPOFP',
  CPRAT: 'var_CPRAT',
  CRAIN: 'var_CRAIN',
  CSNOW: 'var_CSNOW',
  CWAT: 'var_CWAT',
  CWORK: 'var_CWORK',
  DLWRF: 'var_DLWRF',
  DPT: 'var_DPT',
  DSWRF: 'var_DSWRF',
  DZDT: 'var_DZDT',
  FLDCP: 'var_FLDCP',
  FRICV: 'var_FRICV',
  GFLUX: 'var_GFLUX',
  GRLE: 'var_GRLE',
  GUST: 'var_GUST',
  HCDC: 'var_HCDC',
  HGT: 'var_HGT',
  HINDEX: 'var_HINDEX',
  HLCY: 'var_HLCY',
  HPBL: 'var_HPBL',
  ICAHT: 'var_ICAHT',
  ICEC: 'var_ICEC',
  ICEG: 'var_ICEG',
  ICETK: 'var_ICETK',
  ICETMP: 'var_ICETMP',
  ICMR: 'var_ICMR',
  LAND: 'var_LAND',
  LCDC: 'var_LCDC',
  LFTX: 'var_LFTX',
  LHTFL: 'var_LHTFL',
  MCDC: 'var_MCDC',
  MSLET: 'var_MSLET',
  O3MR: 'var_O3MR',
  PEVPR: 'var_PEVPR',
  PLPL: 'var_PLPL',
  POT: 'var_POT',
  PRATE: 'var_PRATE',
  PRES: 'var_PRES',
  PRMSL: 'var_PRMSL',
  PWAT: 'var_PWAT',
  REFC: 'var_REFC',
  REFD: 'var_REFD',
  RH: 'var_RH',
  RWMR: 'var_RWMR',
  SFCR: 'var_SFCR',
  SHTFL: 'var_SHTFL',
  SNMR: 'var_SNMR',
  SNOD: 'var_SNOD',
  SOILL: 'var_SOILL',
  SOILW: 'var_SOILW',
  SOTYP: 'var_SOTYP',
  SPFH: 'var_SPFH',
  SUNSD: 'var_SUNSD',
  TCDC: 'var_TCDC',
  TMAX: 'var_TMAX',
  TMIN: 'var_TMIN',
  TMP: 'var_TMP',
  TOZNE: 'var_TOZNE',
  TSOIL: 'var_TSOIL',
  UFLX: 'var_UFLX',
  UGRD: 'var_UGRD',
  'U-GWD': 'var_U-GWD',
  ULWRF: 'var_ULWRF',
  USTM: 'var_USTM',
  USWRF: 'var_USWRF',
  VEG: 'var_VEG',
  VFLX: 'var_VFLX',
  VGRD: 'var_VGRD',
  'V-GWD': 'var_V-GWD',
  VIS: 'var_VIS',
  VRATE: 'var_VRATE',
  VSTM: 'var_VSTM',
  VVEL: 'var_VVEL',
  VWSH: 'var_VWSH',
  WATR: 'var_WATR',
  WEASD: 'var_WEASD',
  WILT: 'var_WILT',
};
const levels = {
  '0-0.1_m_below_ground': 'lev_0-0.1_m_below_ground',
  '0.1-0.4_m_below_ground': 'lev_0.1-0.4_m_below_ground',
  '0.4-1_m_below_ground': 'lev_0.4-1_m_below_ground',
  '1-2_m_below_ground': 'lev_1-2_m_below_ground',
  '0.995_sigma_level': 'lev_0.995_sigma_level',
  '0.33-1_sigma_layer': 'lev_0.33-1_sigma_layer',
  '0.44-0.72_sigma_layer': 'lev_0.44-0.72_sigma_layer',
  '0.44-1_sigma_layer': 'lev_0.44-1_sigma_layer',
  '0.72-0.94_sigma_layer': 'lev_0.72-0.94_sigma_layer',
  '2_m_above_ground': 'lev_2_m_above_ground',
  '10_m_above_ground': 'lev_10_m_above_ground',
  '20_m_above_ground': 'lev_20_m_above_ground',
  '30_m_above_ground': 'lev_30_m_above_ground',
  '40_m_above_ground': 'lev_40_m_above_ground',
  '50_m_above_ground': 'lev_50_m_above_ground',
  '80_m_above_ground': 'lev_80_m_above_ground',
  '100_m_above_ground': 'lev_100_m_above_ground',
  '1000_m_above_ground': 'lev_1000_m_above_ground',
  '4000_m_above_ground': 'lev_4000_m_above_ground',
  '10_m_above_mean_sea_level': 'lev_10_m_above_mean_sea_level',
  '1829_m_above_mean_sea_level': 'lev_1829_m_above_mean_sea_level',
  '2743_m_above_mean_sea_level': 'lev_2743_m_above_mean_sea_level',
  '3658_m_above_mean_sea_level': 'lev_3658_m_above_mean_sea_level',
  '3000-0_m_above_ground': 'lev_3000-0_m_above_ground',
  '6000-0_m_above_ground': 'lev_6000-0_m_above_ground',
  '180-0_mb_above_ground': 'lev_180-0_mb_above_ground',
  '255-0_mb_above_ground': 'lev_255-0_mb_above_ground',
  '90-0_mb_above_ground': 'lev_90-0_mb_above_ground',
  '30-0_mb_above_ground': 'lev_30-0_mb_above_ground',
  '0C_isotherm': 'lev_0C_isotherm',
  '1_hybrid_level': 'lev_1_hybrid_level',
  '2_hybrid_level': 'lev_2_hybrid_level',
  '1000_mb': 'lev_1000_mb',
  '975_mb': 'lev_975_mb',
  '950_mb': 'lev_950_mb',
  '925_mb': 'lev_925_mb',
  '900_mb': 'lev_900_mb',
  '850_mb': 'lev_850_mb',
  '800_mb': 'lev_800_mb',
  '750_mb': 'lev_750_mb',
  '700_mb': 'lev_700_mb',
  '650_mb': 'lev_650_mb',
  '600_mb': 'lev_600_mb',
  '550_mb': 'lev_550_mb',
  '500_mb': 'lev_500_mb',
  '450_mb': 'lev_450_mb',
  '400_mb': 'lev_400_mb',
  '350_mb': 'lev_350_mb',
  '300_mb': 'lev_300_mb',
  '250_mb': 'lev_250_mb',
  '200_mb': 'lev_200_mb',
  '150_mb': 'lev_150_mb',
  '100_mb': 'lev_100_mb',
  '70_mb': 'lev_70_mb',
  '50_mb': 'lev_50_mb',
  '40_mb': 'lev_40_mb',
  '30_mb': 'lev_30_mb',
  '20_mb': 'lev_20_mb',
  '15_mb': 'lev_15_mb',
  '10_mb': 'lev_10_mb',
  '7_mb': 'lev_7_mb',
  '5_mb': 'lev_5_mb',
  '3_mb': 'lev_3_mb',
  '2_mb': 'lev_2_mb',
  '1_mb': 'lev_1_mb',
  '0.7_mb': 'lev_0.7_mb',
  '0.4_mb': 'lev_0.4_mb',
  '0.2_mb': 'lev_0.2_mb',
  '0.1_mb': 'lev_0.1_mb',
  '0.07_mb': 'lev_0.07_mb',
  '0.04_mb': 'lev_0.04_mb',
  '0.02_mb': 'lev_0.02_mb',
  '0.01_mb': 'lev_0.01_mb',
  surface: 'lev_surface',
  max_wind: 'lev_max_wind',
  mean_sea_level: 'lev_mean_sea_level',
  boundary_layer_cloud_layer: 'lev_boundary_layer_cloud_layer',
  planetary_boundary_layer: 'lev_planetary_boundary_layer',
  tropopause: 'lev_tropopause',
  entire_atmosphere: 'lev_entire_atmosphere',
  entire_atmosphere_single_layer: 'lev_entire_atmosphere_single_layer',
  top_of_atmosphere: 'lev_top_of_atmosphere',
  convective_cloud_layer: 'lev_convective_cloud_layer',
  convective_cloud_bottom_level: 'lev_convective_cloud_bottom_level',
  convective_cloud_top_level: 'lev_convective_cloud_top_level',
  high_cloud_layer: 'lev_high_cloud_layer',
  high_cloud_bottom_level: 'lev_high_cloud_bottom_level',
  high_cloud_top_level: 'lev_high_cloud_top_level',
  low_cloud_layer: 'lev_low_cloud_layer',
  low_cloud_bottom_level: 'lev_low_cloud_bottom_level',
  low_cloud_top_level: 'lev_low_cloud_top_level',
  middle_cloud_layer: 'lev_middle_cloud_layer',
  middle_cloud_bottom_level: 'lev_middle_cloud_bottom_level',
  middle_cloud_top_level: 'lev_middle_cloud_top_level',
  cloud_ceiling: 'lev_cloud_ceiling',
  highest_tropospheric_freezing_level: 'lev_highest_tropospheric_freezing_level',  
};


// Function to download the GRIB file
async function downloadGribFile(date, cycle, selectedVariables, selectedLevels, outputFilename, subregion) {
  try {
    // Construct the base URL
    const baseUrl = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl';

    // Construct the query parameters
    const params = new URLSearchParams();
    params.append('dir', `/gfs.${date}/${cycle}/atmos`);
    params.append('file', `gfs.t${cycle}z.pgrb2.0p25.anl`);

    selectedVariables.forEach((variable) => {
      params.append(`${variable}`, 'on');
    });

    selectedLevels.forEach((level) => {
      params.append(`${level}`, 'on');
    });

    if (subregion) {
      params.append('subregion', '');
      params.append('leftlon', subregion.leftLon);
      params.append('rightlon', subregion.rightLon);
      params.append('toplat', subregion.topLat);
      params.append('bottomlat', subregion.bottomLat);
    }

    const url = `${baseUrl}?${params.toString()}`;

    // Make a GET request to download the GRIB file
    const response = await axios.get(url, { responseType: 'stream' });

    // Save the GRIB file to disk
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputFilename);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    logger.info('GRIB file downloaded successfully.');
  } catch (error) {
    logger.error('Error downloading GRIB file:', error.message);
  }
}


async function getLatestCycle(date) {  
  const url = `${NOAA_BASE_URL}?dir=%2Fgfs.${date}`;

  try {
    const response = await axios.get(url);
    const cycles = response.data.match(/(?<=dir=%2Fgfs\.\d{8}%2F)\d{2}/g);

    if (!cycles || cycles.length === 0) {
      throw new Error('No cycles found for the given date.');
    }

    return Math.max(...cycles.map(cycle => parseInt(cycle))).toString().padStart(2, '0');
  } catch (error) {
    throw new Error(`Request to NOAA failed: ${error.message}`);
  }
}


async function sendMessageToQueue(message) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'grib_updates';
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
    logger.info(" [x] Sent '%s'", message);
    await channel.close();
    await connection.close();
  } catch (error) {
    logger.error("Failed to send message to queue:", error);
  }
}

async function checkForNewGribFile() {  
  try {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cycle = await getLatestCycle(date);    
    // Selecting specific weather data variables for download
    const selectedVariables = [ 
      variables['UGRD'], // U-component of wind
      variables['VGRD'], // V-component of wind
      variables['REFC'], // Composite reflectivity
      variables['PRMSL'] // Pressure reduced to MSL (mean sea level)
    ];
    // Selecting the atmospheric levels for the variables
    const selectedLevels = [
      levels['10_m_above_ground'],
      levels['mean_sea_level'],
      levels['entire_atmosphere']
    ];
    const outputFilename = path.join(GRIB_SAVE_PATH, cycle + '_' + date + '_' + 'gfs_0p25.grb'); 

    await downloadGribFile(date, cycle, selectedVariables, selectedLevels, outputFilename);

    logger.info(`GRIB file downloaded successfully and saved as ${outputFilename}`);    
    
    const message = JSON.stringify({
      event: "New GRIB File Downloaded",
      fileName: outputFilename,
      date,
      cycle
    });
    await sendMessageToQueue(message);
  } catch (error) {
    logger.error('Failed to check and download new GRIB file:', error);
  }
}


// Start checking for new GRIB files every hour
setInterval(checkForNewGribFile, 60 * 60 * 1000);

// Initial check for new GRIB file
checkForNewGribFile();