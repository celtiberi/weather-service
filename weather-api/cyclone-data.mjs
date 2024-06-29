import axios from 'axios';
import xml2js from 'xml2js';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs/promises';
import shapefile from 'shapefile';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseXml = promisify(xml2js.parseString);

const RSS_URL = 'https://www.nhc.noaa.gov/gtwo.xml';
const SHAPEFILE_URL = 'https://www.nhc.noaa.gov/xgtwo/gtwo_shapefiles.zip';
const SHAPEFILE_DIR = path.join(__dirname, 'cyclone_shapefiles');

let cachedShapefiles = null;
let lastUpdate = null;

const shapefilesPromise = (async () => {
  try {
    console.log('Starting initial download and extraction of shapefiles...');
    await downloadAndExtractShapefiles();
    console.log('Initial download and extraction complete. Reading shapefiles...');
    cachedShapefiles = await readShapefiles();
    lastUpdate = new Date();
    console.log('Initial shapefiles read complete. Cached shapefiles are ready.');
  } catch (error) {
    console.error('Error initializing shapefiles:', error);
    throw error;
  }
})();

async function getShapefiles() {
  try {
    console.log('Waiting for shapefiles to be ready...');
    await shapefilesPromise;
    console.log('Shapefiles are ready. Returning cached shapefiles.');
    return cachedShapefiles;
  } catch (error) {
    console.error('Error getting shapefiles:', error);
    throw error;
  }
}

async function downloadAndExtractShapefiles() {
  console.log('Downloading shapefiles from:', SHAPEFILE_URL);
  const files = await fs.readdir(SHAPEFILE_DIR);
  for (const file of files) {
    const filePath = path.join(SHAPEFILE_DIR, file);
    await fs.unlink(filePath);
  }
  const response = await axios.get(SHAPEFILE_URL, { responseType: 'arraybuffer' });
  const zip = new AdmZip(response.data);
  
  await fs.mkdir(SHAPEFILE_DIR, { recursive: true });
  zip.extractAllTo(SHAPEFILE_DIR, true);
  console.log('Shapefiles downloaded and extracted to:', SHAPEFILE_DIR);
}

async function readShapefile(shpPath) {
  const features = [];
  try {
    await shapefile.open(shpPath)
      .then(source => source.read()
        .then(function log(result) {
          if (result.done) return;
          features.push(result.value);
          return source.read().then(log);
        }));
    
    return {
      type: "FeatureCollection",
      features: features
    };
  } catch (error) {
    console.error(`Failed to read shapefile: ${shpPath}`, error);
    return null;
  }
}

async function readShapefiles() {
  const shapefiles = {};
  const files = await fs.readdir(SHAPEFILE_DIR);

  for (const file of files) {
    if (file.endsWith('.shp')) {
      const name = path.parse(file).name;
      const filePath = path.join(SHAPEFILE_DIR, file);
      console.log(`Reading shapefile: ${filePath}`);
      
      const geojson = await readShapefile(filePath);
      if (geojson) {
        shapefiles[name] = geojson;
        console.log(`Finished reading shapefile: ${filePath}, features count: ${geojson.features.length}`);
      }
    }
  }

  return shapefiles;
}

async function updateShapefiles() {
  try {
    console.log('Updating shapefiles...');
    await downloadAndExtractShapefiles();
    cachedShapefiles = await readShapefiles();
    lastUpdate = new Date();
    console.log('Shapefiles updated at', lastUpdate);
  } catch (error) {
    console.error('Error updating shapefiles:', error);
  }
}

// Check for new shapefiles every 30 minutes
setInterval(updateShapefiles, 30 * 60 * 1000);

// Fetch RSS data
async function fetchRssData() {
  try {
    console.log('Fetching RSS data from:', RSS_URL);
    const response = await axios.get(RSS_URL);
    const rssData = await parseXml(response.data);
    console.log('RSS data fetched and parsed successfully.');
    return rssData;
  } catch (error) {
    console.error('Error fetching RSS data:', error);
    throw error;
  }
}


export {
  fetchRssData,
  getShapefiles
};
