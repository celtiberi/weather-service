console.log('jest.setup.js is being executed');
result = require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });;
if (result.error) {
    throw result.error;
  }
console.log('<just.setup.js>RABBITMQ_URL:', process.env.RABBITMQ_URL);