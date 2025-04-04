// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  publicKey: {
    type: String,
    required: true,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // New fields for tracking form submissions
  hasSubmitted: {
    type: Boolean,
    default: false
  },
  submissionCount: {
    type: Number,
    default: 0
  },
  lastSubmissionAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Add a pre-save hook to log the public key
userSchema.pre('save', function(next) {
  console.log('Saving user with public key:', this.publicKey ? 'present' : 'missing');
  if (this.publicKey) {
    console.log('Public key length:', this.publicKey.length);
    console.log('Public key preview:', this.publicKey.substring(0, 50) + '...');
  }
  next();
});

// Add a post-save hook to verify the key was saved
userSchema.post('save', function(doc) {
  console.log('User saved successfully');
  console.log('Stored public key length:', doc.publicKey ? doc.publicKey.length : 0);
  if (doc.publicKey) {
    console.log('Stored public key preview:', doc.publicKey.substring(0, 50) + '...');
  }
});

module.exports = mongoose.model('User', userSchema);
