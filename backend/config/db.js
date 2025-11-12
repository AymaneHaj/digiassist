import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DATABASE_NAME || 'DigiAssistantDB';

export const connectDB = async () => {
  try {
    // Always use DATABASE_NAME from .env, even if URI contains a database name
    let connectionUrl;
    
    // Parse the URI to extract base connection string
    const uriParts = MONGODB_URI.split('/');
    const hasDatabaseInUri = uriParts.length > 3 && !uriParts[3].includes('?');
    
    if (hasDatabaseInUri) {
      // URI contains a database name, replace it with DATABASE_NAME from .env
      // Keep everything before the database name (mongodb://host:port or mongodb+srv://host)
      const baseUri = uriParts.slice(0, 3).join('/');
      const queryString = MONGODB_URI.includes('?') ? MONGODB_URI.split('?')[1] : '';
      
      if (queryString) {
        connectionUrl = `${baseUri}/${DB_NAME}?${queryString}`;
      } else {
        connectionUrl = `${baseUri}/${DB_NAME}?retryWrites=true&w=majority`;
      }
      console.log(`🔄 Replacing database name in URI with: ${DB_NAME}`);
    } else {
      // No database name in URI, append it
      if (MONGODB_URI.includes('?')) {
        connectionUrl = `${MONGODB_URI}&dbName=${DB_NAME}`;
      } else {
        connectionUrl = `${MONGODB_URI}/${DB_NAME}?retryWrites=true&w=majority`;
      }
      console.log(`➕ Appending database name to URI: ${DB_NAME}`);
    }

    console.log(`🔌 Connecting to MongoDB...`);
    console.log(`🎯 Target database name: ${DB_NAME}`);
    
    // Connect with explicit database name option
    await mongoose.connect(connectionUrl, {
      dbName: DB_NAME // Force use of DATABASE_NAME from .env
    });
    
    // Get the actual database name from connection
    const actualDbName = mongoose.connection.db.databaseName;
    console.log(`✅ Connected to MongoDB successfully!`);
    console.log(`📊 Database name: ${actualDbName}`);
    console.log(`🔗 Connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // Log when connection is established
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};