const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// MongoDB connection string
// MONGODB_URI=mongodb://localhost:27017/deep_research
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/deep_research';
console.log('Using MongoDB URI:', MONGODB_URI);

// Connect to MongoDB with improved error handling
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Function to create admin user
async function createAdmin() {
  try {
    // Check if admin already exists
    console.log('Checking if admin user exists...');
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists with ID:', existingAdmin._id);
      console.log('Admin details:', {
        name: existingAdmin.name,
        email: existingAdmin.email,
        isAdmin: existingAdmin.isAdmin,
      });
      
      // If admin exists but doesn't have admin privileges, update them
      if (!existingAdmin.isAdmin) {
        console.log('Fixing admin privileges...');
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
        console.log('Admin privileges updated');
      }
      
      return;
    }
    
    // Create admin user with explicit admin name
    console.log('Creating new admin user...');
    const admin = new User({
      name: 'admin', // Using lowercase 'admin' as requested
      email: 'admin@example.com',
      password: 'admin123', // This will be hashed by the pre-save hook
      isAdmin: true
    });
    
    const savedAdmin = await admin.save();
    console.log('Admin user created successfully with ID:', savedAdmin._id);
    console.log('Credentials: email=admin@example.com, password=admin123');
  } catch (error) {
    console.error('Error creating admin user:', error);
    if (error.code === 11000) {
      console.error('Duplicate key error - admin user might already exist with a different case for name');
    }
  } finally {
    try {
      await mongoose.disconnect();
      console.log('Database connection closed');
    } catch (err) {
      console.error('Error disconnecting from database:', err);
    }
  }
}

// Run the function
createAdmin(); 