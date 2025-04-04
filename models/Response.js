// models/Response.js - Stores anonymous responses
const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  publicKey: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Response', ResponseSchema);
