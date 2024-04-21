// processMessage.test.js
const jackrabbit = require('@pager/jackrabbit');
const chai = require('chai');
const Assert = require('chai').assert;

//import { processMessage } from '../index.js'; // Adjust the path as necessary
const shared = require('weather-service-shared');

const RABBITMQ_URL="amqp://admin:password@localhost:5672"


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
    const rpc = exchange.queue({ name: 'point_forecast', prefetch: 1, durable: true });
    
    const onReply = (response) => {
      console.log(response)
      Assert.exists(response)
      Assert.notInclude(response, 'error')
      done()
    };
    
    rpc.on('ready', () => {
        exchange.publish( pointForecastRequest, {
            key: 'point_forecast',
            reply: onReply    // auto sends necessary info so the reply can come to the exclusive reply-to queue for this rabbit instance
        });
    });
    
  }).timeout(25 * 1000); 
     
});


