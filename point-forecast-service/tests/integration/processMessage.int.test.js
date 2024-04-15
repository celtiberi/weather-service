// processMessage.test.js
const jackrabbit = require('@pager/jackrabbit');

const { processMessage } = require('../../../point-forecast-service/index'); // Adjust the path as necessary
const shared = require("weather-service-shared")

const RABBITMQ_URL="amqp://admin:password@localhost:5672"

describe('processMessage', () => {
  let rabbit;

  beforeAll(async () => {
    console.log('RABBITMQ_URL: ' + RABBITMQ_URL)
    rabbit = jackrabbit(RABBITMQ_URL);
  });

  afterAll(async () => {
    rabbit.close();
  });

  it('should process message and interact with RabbitMQ as expected', async () => {

    const pointForecastRequest = {
      lat: 40.7128, // Example latitude
      lon: -74.0060 // Example longitude
    };

    const exchange = rabbit.default();
    const rpc = exchange.queue({ name: 'point_forecast', prefetch: 1, durable: true });
    
    const onReply = (data) => {
      console.log('result:', data.result);
      expect(data.result).toBeDefined();
      // expect(data.result).toHaveProperty('location');
      // expect(data.result.location).toBe('New York, NY');
      // expect(data.result).toHaveProperty('forecast');
      // expect(data.result.forecast).toContain('Partly cloudy');
    };
    
    rpc.on('ready', () => {
        exchange.publish( pointForecastRequest, {
            key: 'point_forecast',
            reply: onReply    // auto sends necessary info so the reply can come to the exclusive reply-to queue for this rabbit instance
        });
    });
  });
     
});

