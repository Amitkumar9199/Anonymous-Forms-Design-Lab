const mongoose = require('mongoose');

const formSubmissionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  publicKey: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  // Remove timestamps to enhance privacy
  timestamps: false
});

// Add logging to track what's being saved
formSubmissionSchema.pre('save', function(next) {
  console.log('Saving form submission:', {
    hasContent: !!this.content,
    hasPublicKey: !!this.publicKey,
    hasSignature: !!this.signature,
    hasUserId: !!this.userId,
    isVerified: this.verified
  });
  next();
});

module.exports = mongoose.model('FormSubmission', formSubmissionSchema); 