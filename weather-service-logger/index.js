const winston = require('winston');
const { LogstashTransport } = require('winston-logstash-transport');

const createLogger = (serviceName) => {
  const logger = winston.createLogger({
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console(),
      new LogstashTransport({
        host: process.env.LOGSTASH_HOST || 'logstash',
        port: process.env.LOGSTASH_PORT || 5044,
        format: winston.format.json(),
      }),
    ],
  });

  return logger;
};

module.exports = createLogger;
