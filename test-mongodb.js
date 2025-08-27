const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoConnection() {
  console.log('🔍 Testing MongoDB Connection...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('Available environment variables:');
    Object.keys(process.env).filter(key => key.includes('MONGO')).forEach(key => {
      console.log(`  ${key}: ${process.env[key] ? '✅ Set' : '❌ Not set'}`);
    });
    return;
  }

  console.log('📍 MongoDB URI found (credentials hidden)');
  console.log('URI format:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // 15 seconds
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connection successful!');
    
    // Test database operations
    console.log('🔄 Testing database operations...');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:`, collections.map(c => c.name));
    
    // Test ping
    const pingResult = await db.admin().ping();
    console.log('🏓 Ping result:', pingResult);
    
    // Test a simple query if contacts collection exists
    const Contact = require('./models/Contact');
    const contactCount = await Contact.countDocuments();
    console.log(`📝 Total contacts in database: ${contactCount}`);
    
    console.log('🎉 All tests passed! MongoDB is working correctly.');
    
  } catch (error) {
    console.error('❌ MongoDB connection test failed:');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n🔍 Troubleshooting tips:');
      console.error('1. Check if MongoDB service is running on Railway');
      console.error('2. Verify the MONGODB_URI is correct');
      console.error('3. Check network connectivity');
      console.error('4. Ensure Railway MongoDB instance is active');
    }
    
    if (error.name === 'MongoParseError') {
      console.error('\n🔍 URI format issues:');
      console.error('1. Check for special characters that need URL encoding');
      console.error('2. Verify the URI format: mongodb://user:pass@host:port/database');
      console.error('3. Ensure no extra spaces or characters');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n🔍 DNS/Network issues:');
      console.error('1. Check if the MongoDB host is reachable');
      console.error('2. Verify Railway MongoDB service is deployed');
      console.error('3. Check if Railway project is active');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the test
testMongoConnection()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
