process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server'); // Adjust the path as necessary

chai.use(chaiHttp);
const expect = chai.expect;

describe('/point-forecast', () => {
  it('should respond with forecasts', (done) => {
    chai.request(server)
      .get('/point-forecast')
      // 21.428, -154.569
      .query({ lat: 21.428, lon: -154.569 }) // Adjust the coordinates as necessary
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('coastal');
        expect(res.body).to.have.property('offshore');
        expect(res.body).to.have.property('high_seas');
        done();
      });
  });
});