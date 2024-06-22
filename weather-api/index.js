const express = require('express');
const jackrabbit = require('@pager/jackrabbit');
const path = require('path');
const { createLogger, nws } = require('../shared/module');
const { analyzeWeatherForecast } = require('./forecast-analysis.js');

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
// TODO not sure I need this here.  Maybe just in the push notification code when I make it?
// When I am track a boats waypoints I will need it in that code as well.
const rabbit = jackrabbit(process.env.RABBITMQ_URL);
var exchange = rabbit.default();
var forecastUpdate = exchange.queue({ name: 'forecast_update' });
//  ---------------------------

app.get('/point-forecast', async (req, res) => {
  try {
    logger.info(`[GET] /point-forecast with lat: ${req.query.lat} and lon: ${req.query.lon}`);

    const coordinate = {
      lat: parseFloat(req.query.lat),
      lon: parseFloat(req.query.lon),
    };

    let forecasts = await nws.getPointForecasts(coordinate.lat, coordinate.lon)
    
    if(!forecasts)
    {
      res.status(404).send("No forecast available for the selected location.");
      return;
    }

    if (forecasts) {
      forecastsAnalysis = await analyzeWeatherForecast(forecasts);
    }

    res.json({ forecastsAnalysis, forecasts });
    
  } catch (error) {
    logger.error(`Error fetching point forecasts: ${error.message}`);
    res.status(500).send(error.message);
  }
});

// Start the server
const server = app.listen(3100, () => {
  logger.info('Server is running on port 3100');
});

module.exports = server;