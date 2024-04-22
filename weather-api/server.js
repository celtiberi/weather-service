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

logger.info(`RABBITMQ_URL: ${process.env.RABBITMQ_URL}`);

// ------- RABBIT SETUP -------
const rabbit = jackrabbit(process.env.RABBITMQ_URL);
const exchange = rabbit.default();
const rpc_point_forecast_queue = exchange.queue({ name: 'rpc_point_forecast_queue' });
//  ---------------------------

// TODO maybe do not start the server until the queue is ready?  Why would it not be ready?
rpc_point_forecast_queue.on('ready', () => {
  logger.info('rpc_point_forecast_queue is ready'); 
});

rpc_point_forecast_queue.on('error', (err) => {
  logger.error(`rpc_point_forecast_queue on error: ${err.message}`);
});

app.get('/point-forecast', async (req, res) => {
  logger.info(`[GET] /point-forecast with lat: ${req.query.lat} and lon: ${req.query.lon}`);

  const messageData = {
    lat: parseFloat(req.query.lat),
    lon: parseFloat(req.query.lon),
  };

  const onReply = (forecasts) => {
    logger.info('onReply called at: ' + new Date().toISOString());
    logger.info(forecasts);
    res.json(forecasts);
  };
  
  // TODO the below code will never be called.  Why? I think I am simply missing the event (time)
  //    Better would be if there was an onReady promise from Jackrabbit (there might be).
  // rpc_point_forecast_queue.on('ready', () => {
  //   logger.info('rpc_point_forecast_queue is ready'); 
  // });

  // TODO should have a timeout.  There is an example in jackrabbit
  exchange.publish( messageData, {
    key: 'rpc_point_forecast_queue',
    reply: onReply,
  });
  
});

// Start the server
const server = app.listen(3100, () => {
  logger.info('Server is running on port 3100');
});

module.exports = server;