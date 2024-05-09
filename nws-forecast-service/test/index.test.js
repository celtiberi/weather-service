const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { expect } = chai;
chai.use(chaiAsPromised);
const dotenv = require('dotenv');
const path = require('path');
const {nws} = require('../../shared/module')

const getDotEnvPath = (env) => {
  if (env === 'TEST') {
    return '.env.test';
  }
  return '.env';
};

dotenv.config({
  path: path.resolve(
    process.cwd(),
    getDotEnvPath(process.env.NODE_ENV?.toUpperCase())
  ),
});

describe('Integration Test - index.js', () => {
  it('should fetch and save forecasts successfully', async () => {

    // Import the index module
    const app = require('../index.js');
    //await app.initializeApp()

    await nws.mongooseConnectionPromise;
    const coastalForecasts = await nws.Forecast.find({ zoneType: 'coastal' });
    const offshoreForecasts = await nws.Forecast.find({ zoneType: 'offshore' });
    const highSeasForecasts = await nws.Forecast.find({ zoneType: 'high_seas' });

    expect(coastalForecasts).to.have.lengthOf.at.least(1);
    expect(offshoreForecasts).to.have.lengthOf.at.least(1);
    expect(highSeasForecasts).to.have.lengthOf.at.least(1);


    // Clean up the test data
    //await nws.Forecast.deleteMany({});
  });
});