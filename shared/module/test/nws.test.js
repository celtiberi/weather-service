process.env.NODE_ENV = 'test';

const chai = require('chai');
const expect = chai.expect;
const nws = require('../nws.js');
const mongoose = require('mongoose');

describe('NWS Module', function() {
  it('should return a valid marine zone object', async function() {
    const zones = await nws.getMarineZones();
    expect(zones).to.be.an('object');
    expect(zones).to.have.property('coastal');
    expect(zones).to.have.property('offshore');
    expect(zones).to.have.property('high_seas');
    // the length could change with updated shape files from NWS.  Will be good for the test to fail
    // so that I know I need to update the shape files
    expect(Object.keys(zones['coastal']).length).to.equal(565);
    expect(Object.keys(zones['offshore']).length).to.equal(130);
    expect(Object.keys(zones['high_seas']).length).to.equal(6);    
  });

  it('should return a valid marine zone object by GPS', async function() {
    const lat = 14.364; // Example latitude
    const lon = -76.584; // Example longitude
    const zones = await nws.getMarineZonesByGPS(lat, lon);
    expect(zones).to.be.an('object');
    expect(zones).to.have.property('coastal');
    expect(zones).to.have.property('offshore');
    expect(zones).to.have.property('high_seas');
    expect(zones).to.have.property('offshore').that.is.not.null;
    expect(zones).to.have.property('high_seas').that.is.not.null;
  });

  it('should fetch and save forecasts successfully', async () => {

    const savedForecasts = await nws.Forecast.find({}); // find all forecast
    expect(savedForecasts).to.have.lengthOf.at.least(1);

    // Check if the fetched forecasts are not empty
    savedForecasts.forEach((forecast) => {
      expect(forecast.zoneId).to.be.a('string').and.not.be.empty;
      expect(forecast.zoneType).to.be.a('string').and.not.be.empty;
      expect(forecast.forecast).to.be.a('string').and.not.be.empty;
      expect(forecast.expiresAt).to.be.a('date');
    });

    // Clean up the test data
    await Forecast.deleteMany({});
  });

  it('should return local time for a given marine zone', async function() {
    const zoneId = 'AMZ671'; // Example zone ID
    const zoneType = 'coastal'; // Example zone type
    const localTime = await nws.getLocalTimeForZone(zoneId, zoneType);
    expect(localTime).to.equal("America/Nassau");
  });

});
