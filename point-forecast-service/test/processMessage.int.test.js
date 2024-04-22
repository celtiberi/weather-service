// processMessage.test.js
const jackrabbit = require('@pager/jackrabbit');
const chai = require('chai');
const Assert = require('chai').assert;
const pfs = require('../index.js')
//import { processMessage } from '../index.js'; // Adjust the path as necessary
const shared = require('weather-service-shared');
const path = require('path');
const dotenv = require('dotenv');
const getDotEnvPath = (env) => {
  if (env === 'TEST') {
    return '.env.test';
  }
  return '.env';
};

dotenv.config({ path: path.resolve(process.cwd(), getDotEnvPath(process.env.NODE_ENV?.toUpperCase())) });

const RABBITMQ_URL=process.env.RABBITMQ_URL


describe('processMessage', function() {
  this.timeout(25 * 1000);
  let rabbit;

  beforeEach( done => {
    console.log('RABBITMQ_URL: ' + RABBITMQ_URL)
    rabbit = jackrabbit(RABBITMQ_URL);
    rabbit.once('connected', done);    
  });

  afterEach( done => {
    rabbit.close(done);        
  });

  it('should process message and interact with RabbitMQ as expected',  function(done) {

    const pointForecastRequest = {
      lat: 14.364, // Example latitude
      lon: -76.584 // Example longitude
    };

    const exchange = rabbit.default();
    
    const onReply = (response) => {
      console.log(response)
      Assert.exists(response)
      Assert.notInclude(response, 'error')
      done()
    };
    
    exchange.publish( pointForecastRequest, {
        key: 'rpc_point_forecast_queue',
        reply: onReply    // auto sends necessary info so the reply can come to the exclusive reply-to queue for this rabbit instance
    });
    
  }).timeout(25 * 1000); 
     
});


