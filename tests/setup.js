const mongoose = require('mongoose');
const User = require('../models/User');

async function setupTestDatabase() {
  try {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Create test admin user
    const adminUser = new User({
      email: 'admin@example.com',
      isAdmin: true
    });
    
    await adminUser.save();
    console.log('Test admin user created');
    
    return adminUser;
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
}

async function cleanupTestDatabase() {
  try {
    // Clean up test data
    await User.deleteMany({});
    console.log('Test data cleaned up');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
}

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase
}; 