import axios from 'axios';
import cheerio from 'cheerio';
import AdmZip from 'adm-zip';
import shapefile from 'shapefile';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NHC_GIS_URL = 'https://www.nhc.noaa.gov/gis/';
const NHC_URL = 'https://www.nhc.noaa.gov/cyclones/';
const HURRICANE_DIR = path.join(__dirname, 'hurricanes');

let cachedHurricaneShapefiles = null;
let cachedHurricaneInfo = null;
let lastUpdate = null;

const hurricaneDataPromise = (async () => {
  try {
    await updateHurricaneData();
  } catch (error) {
    console.error('Error initializing hurricane data:', error);
  }
})();

async function getShapefiles() {
  try {
    console.log('Waiting for hurricane data to be ready...');
    await hurricaneDataPromise;
    console.log('Hurricane data is ready. Returning cached shapefiles.');
    return cachedHurricaneShapefiles;
  } catch (error) {
    console.error('Error getting hurricane shapefiles:', error);
    throw error;
  }
}

async function getHurricaneInformation() {
  try {
    console.log('Waiting for hurricane data to be ready...');
    await hurricaneDataPromise;
    console.log('Hurricane data is ready. Returning cached information.');
    return cachedHurricaneInfo;
  } catch (error) {
    console.error('Error getting hurricane information:', error);
    throw error;
  }
}

async function fetchHurricaneLinks() {
  const response = await axios.get(NHC_GIS_URL);
  const $ = cheerio.load(response.data);

  const hurricaneLinks = [];
  $('table').first().find('tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 2) {
      const titleCell = $(cells[0]);
      if (titleCell.find('b').text().includes('Advisory Forecast Track, Cone of Uncertainty')) {
        $(cells[1]).find('a[href$=".zip"]').each((j, link) => {
          const href = $(link).attr('href');
          if (href && href.includes('_5day_')) {
            const name = href.match(/al\d{6}/)[0];
            hurricaneLinks.push({ name, shpLink: href });
          }
        });
      }
    }
  });

  console.log('Fetched hurricane links:', hurricaneLinks);
  return hurricaneLinks;
}

async function downloadAndExtractShapefile(hurricane) {
  const { name, shpLink } = hurricane;
  const hurricaneDir = path.join(HURRICANE_DIR, `AdvisoryForecastTrack_${name}`);

  await fs.mkdir(hurricaneDir, { recursive: true });

  const downloadLink = new URL(shpLink, NHC_GIS_URL).href;
  console.log(`Downloading shapefile from: ${downloadLink}`);
  
  try {
    const zipResponse = await axios.get(downloadLink, { 
      responseType: 'arraybuffer',
      timeout: 30000 // 30 seconds timeout
    });
    console.log(`Download complete. File size: ${zipResponse.data.byteLength} bytes`);

    const zip = new AdmZip(zipResponse.data);
    const zipEntries = zip.getEntries();
    console.log(`Zip file contents: ${zipEntries.map(entry => entry.entryName).join(', ')}`);

    zip.extractAllTo(hurricaneDir, true);

    console.log(`Shapefile for ${name} extracted to: ${hurricaneDir}`);
    const extractedFiles = await fs.readdir(hurricaneDir);
    console.log(`Extracted files: ${extractedFiles.join(', ')}`);
  } catch (error) {
    console.error(`Failed to download or extract shapefile from ${downloadLink}`, error);
    throw error;
  }
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

async function readHurricaneShapefiles() {
  const hurricaneData = {};
  const hurricaneDirs = await fs.readdir(HURRICANE_DIR);

  for (const hurricaneName of hurricaneDirs) {
    const hurricaneDir = path.join(HURRICANE_DIR, hurricaneName);
    const files = await fs.readdir(hurricaneDir);
    const shpFiles = files.filter(file => file.endsWith('.shp'));

    if (shpFiles.length > 0) {
      const shpPath = path.join(hurricaneDir, shpFiles[0]);
      console.log(`Reading shapefile: ${shpPath}`);
      
      const geojson = await readShapefile(shpPath);
      if (geojson) {
        hurricaneData[hurricaneName] = geojson;
        console.log(`Finished reading shapefile: ${shpPath}, features count: ${geojson.features.length}`);
      }
    }
  }

  return hurricaneData;
}

async function fetchHurricaneInformation() {
  try {
    const response = await axios.get(NHC_URL);
    const $ = cheerio.load(response.data);
    
    const hurricaneInfo = {};

    $('table').each((i, table) => {
      const $table = $(table);
      const stormName = $table.find('a[name]').attr('name');
      
      if (stormName) {
        hurricaneInfo[stormName] = {
          name: stormName,
          type: $table.find('td.hdr b').text(),
          details: {},
          products: {}
        };

        $table.find('td.reg').first().text().split('\n').forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            hurricaneInfo[stormName].details[key] = value;
          }
        });

        $table.find('a').each((j, link) => {
          const $link = $(link);
          const href = $link.attr('href');
          const text = $link.text().trim();
          
          if (href && text) {
            hurricaneInfo[stormName].products[text] = href.startsWith('http') ? href : `https://www.nhc.noaa.gov${href}`;
          }
        });
      }
    });

    return hurricaneInfo;
  } catch (error) {
    console.error('Error fetching hurricane information:', error);
    throw error;
  }
}

async function updateHurricaneData() {
  try {
    console.log('Updating hurricane data...');
    await fs.mkdir(HURRICANE_DIR, { recursive: true });

    const hurricaneLinks = await fetchHurricaneLinks();
    console.log('Hurricane links:', hurricaneLinks);

    for (const hurricane of hurricaneLinks) {
      await downloadAndExtractShapefile(hurricane);
    }
    
    cachedHurricaneShapefiles = await readHurricaneShapefiles();
    console.log('Hurricane shapefiles updated at', new Date());

    cachedHurricaneInfo = await fetchHurricaneInformation();
    console.log('Hurricane information updated at', new Date());

    lastUpdate = new Date();
  } catch (error) {
    console.error('Error updating hurricane data:', error);
  }
}

// Check for new hurricane data every 30 minutes
setInterval(updateHurricaneData, 30 * 60 * 1000);

// Export functions
export { getShapefiles, getHurricaneInformation };