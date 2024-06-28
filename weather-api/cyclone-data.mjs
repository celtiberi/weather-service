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
  await updateShapefiles();
})();

async function getShapefiles() {
  try {
    await shapefilesPromise;
    return cachedShapefiles;
  } catch (error) {
    console.error('Error getting shapefiles:', error);
    throw error;
  }
}

async function fetchRssData() {
  const response = await axios.get(RSS_URL);
  const result = await parseXml(response.data);
  return result;
}

async function downloadAndExtractShapefiles() {
  const response = await axios.get(SHAPEFILE_URL, { responseType: 'arraybuffer' });
  const zip = new AdmZip(response.data);
  
  await fs.mkdir(SHAPEFILE_DIR, { recursive: true });
  zip.extractAllTo(SHAPEFILE_DIR, true);
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

export {
  fetchRssData,
  getShapefiles
};
