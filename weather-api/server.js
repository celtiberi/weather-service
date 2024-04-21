const express = require('express');
const mongoose = require('mongoose');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path');

const dotenv = require('dotenv');
const getDotEnvPath = (env) => {
  if (env === 'TEST') {
    return '.env.test';
  }
  return '.env';
};
dotenv.config({ path: path.resolve(process.cwd(), getDotEnvPath(process.env.NODE_ENV?.toUpperCase())) });

const createLogger = require('weather-service-logger');
const logger = createLogger('weather-api', process.env.LOGSTASH_PORT || 5044);
logger.info('Hello, weather-api');

const app = express();
app.use(express.json());

const RABBITMQ_URL = process.env.RABBITMQ_URL
logger.info(`RABBITMQ_URL: ${RABBITMQ_URL}`);

const rabbit = jackrabbit(RABBITMQ_URL);
const exchange = rabbit.default();
const rpc = exchange.queue({ name: 'point_forecast', prefetch: 1, durable: true });

app.get('/point-forecast', async (req, res) => {
  logger.info(`[GET] /point-forecast with lat: ${req.query.lat} and lon: ${req.query.lon}`);

  const pointForecastRequest = {
    lat: parseFloat(req.query.lat),
    lon: parseFloat(req.query.lon),
  };

  const onReply = (forecasts) => {
    logger.info('onReply called at: ' + new Date().toISOString());
    logger.info(forecasts);
    res.json(forecasts);
  };

  const onError = (err) => {
    logger.error('Error in point-forecast request:', err);
    res.status(500).json({ error: 'Failed to fetch forecast', message: err.message });
  };

  logger.info('/point-forecast - publishing point_forecast');
  rpc.once('ready', () => {
    exchange.publish(
      pointForecastRequest,
      {
        key: 'point_forecast',
        reply: onReply,
      },
      onError
    );
  });
});

// Start the server
const server = app.listen(3100, () => {
  logger.info('Server is running on port 3100');
});

module.exports = server;