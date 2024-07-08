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
const HURRICANE_DIR = path.join(__dirname, 'hurricanes'); // Adjust this path as needed

let cachedHurricaneShapefiles = null;
let cachedHurricaneData = null;
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
    console.error('Error getting hurricane data:', error);
    throw error;
  }
}

async function getImages() {
  try {
    console.log('Waiting for hurricane data to be ready...');
    await hurricaneDataPromise;
    console.log('Hurricane data is ready. Returning cached data.');
    return cachedHurricaneData;
  } catch (error) {
    console.error('Error getting hurricane data:', error);
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
      const name = $(cells[0]).text().trim();
      const shpLink = $(cells[1]).find('a[href$=".zip"]').attr('href');
      if (name && shpLink) {
        hurricaneLinks.push({ name, shpLink });
      }
    }
  });

  return hurricaneLinks;
}

async function downloadAndExtractShapefile(hurricane) {
  const { name, shpLink } = hurricane;
  const hurricaneDir = path.join(HURRICANE_DIR, name);

  await fs.mkdir(hurricaneDir, { recursive: true });

  const downloadLink = new URL(shpLink, NHC_GIS_URL).href;
  try {
    const zipResponse = await axios.get(downloadLink, { responseType: 'arraybuffer' });
    const zip = new AdmZip(zipResponse.data);
    zip.extractAllTo(hurricaneDir, true);

    console.log(`Shapefile for ${name} downloaded and extracted to: ${hurricaneDir}`);
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

    hurricaneData[hurricaneName] = {};

    for (const shpFile of shpFiles) {
      const shpPath = path.join(hurricaneDir, shpFile);
      console.log(`Reading shapefile: ${shpPath}`);
      
      const geojson = await readShapefile(shpPath);
      if (geojson) {
        const layerName = path.parse(shpFile).name;
        hurricaneData[hurricaneName][layerName] = geojson;
        console.log(`Finished reading shapefile: ${shpPath}, features count: ${geojson.features.length}`);
      }
    }
  }

  return hurricaneData;
}

async function getHurricaneData() {
  try {
    const response = await axios.get(NHC_URL);
    const $ = cheerio.load(response.data);
    
    const hurricaneData = {};

    // Find all storm tables
    $('table').each((i, table) => {
      const $table = $(table);
      const stormName = $table.find('a[name]').attr('name');
      
      if (stormName) {
        hurricaneData[stormName] = {
          name: stormName,
          type: $table.find('td.hdr b').text(),
          details: {},
          products: {}
        };

        // Extract storm details
        $table.find('td.reg').first().text().split('\n').forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            hurricaneData[stormName].details[key] = value;
          }
        });

        // Extract links to products
        $table.find('a').each((j, link) => {
          const $link = $(link);
          const href = $link.attr('href');
          const text = $link.text().trim();
          
          if (href && text) {
            hurricaneData[stormName].products[text] = href.startsWith('http') ? href : `https://www.nhc.noaa.gov${href}`;
          }
        });
      }
    });

    return hurricaneData;
  } catch (error) {
    console.error('Error fetching hurricane data:', error);
    throw error;
  }
}

async function getHurricaneImages() {
  try {
    const hurricaneData = await getHurricaneData();
    
    // Create a directory for each storm
    for (const [stormName, stormData] of Object.entries(hurricaneData)) {
      const stormDir = path.join(HURRICANE_DIR, stormName);
      await fs.mkdir(stormDir, { recursive: true });
      
      // Save storm data as JSON
      await fs.writeFile(path.join(stormDir, 'data.json'), JSON.stringify(stormData, null, 2));
    }

    return hurricaneData;
  } catch (error) {
    console.error('Error processing hurricane data:', error);
    throw error;
  }
}

async function updateHurricaneData() {
  try {
    console.log('Updating hurricane data...');
    await fs.mkdir(HURRICANE_DIR, { recursive: true });

    const hurricaneLinks = await fetchHurricaneLinks();
    console.log('Hurricane links:', hurricaneLinks);

    // Download and extract new shapefiles
    for (const hurricane of hurricaneLinks) {
      await downloadAndExtractShapefile(hurricane);
    }
    
    cachedHurricaneShapefiles = await readHurricaneShapefiles();
    console.log('Hurricane shapefiles updated at', new Date());

    cachedHurricaneData = await getHurricaneImages();
    console.log('Hurricane data updated at', new Date());

    lastUpdate = new Date();
  } catch (error) {
    console.error('Error updating hurricane data:', error);
  }
}

// Check for new hurricane data every 30 minutes
setInterval(updateHurricaneData, 30 * 60 * 1000);

// Export functions
export { getShapefiles, getImages };
