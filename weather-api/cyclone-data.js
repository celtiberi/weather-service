// cyclone-data.js
const axios = require('axios');
const xml2js = require('xml2js');
const shapefile = require('shapefile');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const parseXml = promisify(xml2js.parseString);
const streamPipeline = promisify(require('stream').pipeline);

const RSS_URL = 'https://www.nhc.noaa.gov/gtwo.xml';
const SHAPEFILE_URL = 'https://www.nhc.noaa.gov/xgtwo/gtwo_shapefiles.zip';
const SHAPEFILE_DIR = path.join(__dirname, 'cyclone_shapefiles');

async function fetchRssData() {
  const response = await axios.get(RSS_URL);
  const result = await parseXml(response.data);
  return result;
}

async function downloadShapefiles() {
  const response = await axios({
    method: 'get',
    url: SHAPEFILE_URL,
    responseType: 'stream'
  });

  if (!fs.existsSync(SHAPEFILE_DIR)) {
    fs.mkdirSync(SHAPEFILE_DIR);
  }

  const zipPath = path.join(SHAPEFILE_DIR, 'cyclone_shapefiles.zip');
  await streamPipeline(response.data, fs.createWriteStream(zipPath));

  // Unzip the file (you may need to implement this part)
  // For simplicity, we'll assume the files are unzipped for now
}

async function readShapefiles() {
  const shapefiles = {};
  const files = fs.readdirSync(SHAPEFILE_DIR);

  for (const file of files) {
    if (file.endsWith('.shp')) {
      const name = path.parse(file).name;
      const source = await shapefile.open(path.join(SHAPEFILE_DIR, file));
      const features = [];
      let feature;
      while ((feature = await source.read()) !== null) {
        features.push(feature);
      }
      shapefiles[name] = features;
    }
  }

  return shapefiles;
}

module.exports = {
  fetchRssData,
  downloadShapefiles,
  readShapefiles
};