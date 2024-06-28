import { initializeApp } from './app.mjs';

// async function connectToMongoDB() {
//   console.log('[index.js] Connecting to MongoDB');
//   const mongodbUri = 'mongodb://mongodb:27017/ocean';
//   try {
//     connection = await mongoose.connect(mongodbUri, {
//       serverSelectionTimeoutMS: 30000,
//       socketTimeoutMS: 45000,
//     });
//     console.log('[index.js] Mongoose connected to MongoDB');
//     console.log(`[index.js] Mongoose connection ready state: ${mongoose.connection.readyState}`);

//     mongoose.connection.on('disconnected', () => {
//       console.log('[index.js] Disconnected from MongoDB');
//     });

//     mongoose.connection.on('error', (error) => {
//       console.error('[index.js] MongoDB connection error:', error);
//     });

//   } catch (error) {
//     console.error('[index.js] Error connecting to MongoDB:', error);
//     throw error;
//   }
// }

// connectToMongoDB().then(() => {
//   initializeApp();
// });


initializeApp();
