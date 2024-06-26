const { initializeApp } = require('./app');
const {database} = require('../shared/module');

database.connectToMongoDB().then(() => {
  initializeApp();
});

