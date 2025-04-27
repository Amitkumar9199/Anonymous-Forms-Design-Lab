// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  publicKey: {
    type: String,
    required: false, // Not required during signup, will be generated later
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // Fields for tracking form submissions
  hasSubmitted: {
    type: Boolean,
    default: false
  },
  submissionCount: {
    type: Number,
    default: 0
  }
}, {
  // Remove timestamps to enhance privacy
  timestamps: false
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  const user = this;
  
  // Only hash the password if it's modified (or new)
  if (!user.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password with the salt
    const hashedPassword = await bcrypt.hash(user.password, salt);
    
    // Replace plain text password with hashed one
    user.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Log other important information
userSchema.pre('save', function(next) {
  console.log('Saving user:', {
    name: this.name,
    email: this.email,
    hasPublicKey: !!this.publicKey,
    isAdmin: this.isAdmin
  });
  
  if (this.publicKey) {
    console.log('Public key length:', this.publicKey.length);
    console.log('Public key preview:', this.publicKey.substring(0, 50) + '...');
  }
  next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Add a post-save hook to verify the user was saved
userSchema.post('save', function(doc) {
  console.log('User saved successfully');
  console.log('User details:', {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    hasPublicKey: !!doc.publicKey,
    isAdmin: doc.isAdmin
  });
  
  if (doc.publicKey) {
    console.log('Stored public key length:', doc.publicKey.length);
    console.log('Stored public key preview:', doc.publicKey.substring(0, 50) + '...');
  }
});

module.exports = mongoose.model('User', userSchema);
