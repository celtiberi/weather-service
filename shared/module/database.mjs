import mongoose from 'mongoose';

let connection = null;

async function connectToMongoDB() {
  if (connection) {
    return connection;
  }

  const mongodbUri = 'mongodb://mongodb:27017/ocean';
  try {
    connection = await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('Mongoose connected to MongoDB');
    console.log(`Mongoose connection ready state: ${mongoose.connection.readyState}`);

    mongoose.connection.on('disconnected', () => {
      console.log('Disconnected from MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    return connection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

async function getConnection() {
    if (!connection || mongoose.connection.readyState !== 1) {
      await connectToMongoDB();
    }
    return connection;
}

export { 
    connectToMongoDB,
    getConnection,
    mongoose
};