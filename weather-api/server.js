const express = require('express');
const mongoose = require('mongoose');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path');
const { createLogger, nws } = require('../shared/module');

const dotenv = require('dotenv');
const getDotEnvPath = (env) => {
  if (env === 'TEST') {
    return '.env.test';
  }
  return '.env';
};
dotenv.config({ path: path.resolve(process.cwd(), getDotEnvPath(process.env.NODE_ENV?.toUpperCase())) });

const logger = createLogger('weather-api', process.env.LOGSTASH_PORT || 5044);
logger.info('Hello, weather-api');

const app = express();
app.use(express.json());

logger.info(`RABBITMQ_URL: ${process.env.RABBITMQ_URL}`);

// ------- RABBIT SETUP -------
const rabbit = jackrabbit(process.env.RABBITMQ_URL);
var exchange = rabbit.default();
var forecastUpdate = exchange.queue({ name: 'forecast_update' });
//  ---------------------------

app.get('/point-forecast', async (req, res) => {
  logger.info(`[GET] /point-forecast with lat: ${req.query.lat} and lon: ${req.query.lon}`);

  const coordinate = {
    lat: parseFloat(req.query.lat),
    lon: parseFloat(req.query.lon),
  };

  let forecasts = await nws.getPointForecasts(coordinate.lat, coordinate.lon)

  res.json(forecasts);
});

// Start the server
const server = app.listen(3100, () => {
  logger.info('Server is running on port 3100');
});

module.exports = server;