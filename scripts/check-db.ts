import { config } from 'dotenv';
import mongoose from 'mongoose';

config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('Disconnected');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
