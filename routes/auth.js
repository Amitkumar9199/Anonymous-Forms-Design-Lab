const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateKeyPair } = require('../services/crypto');

// Add middleware to log all requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt with email:', req.body.email);
    const { email } = req.body;
    
    if (!email) {
      console.log('No email provided');
      return res.status(400).json({ message: 'Email is required' });
    }

    let user = await User.findOne({ email });
    console.log('User found:', user ? 'yes' : 'no');

    let privateKey = null;
    if (!user) {
      console.log('Generating new key pair for user');
      const keyPair = generateKeyPair();
      privateKey = keyPair.privateKey;
      
      console.log('Creating new user with public key');
      user = new User({
        email,
        publicKey: keyPair.publicKey,
        isAdmin: email === 'admin@example.com'
      });
      
      try {
        await user.save();
        console.log('New user saved successfully with public key');
        console.log('User public key length:', user.publicKey ? user.publicKey.length : 0);
      } catch (saveError) {
        console.error('Error saving new user:', saveError);
        return res.status(500).json({ message: 'Error creating user' });
      }
    } else {
      console.log('Existing user public key length:', user.publicKey ? user.publicKey.length : 0);
      if (!user.publicKey) {
        console.log('No public key found for existing user, generating new key pair');
        const keyPair = generateKeyPair();
        user.publicKey = keyPair.publicKey;
        privateKey = keyPair.privateKey;
        await user.save();
        console.log('Updated user with new public key');
      }
    }

    console.log('User isAdmin status:', user.isAdmin);

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Login successful, sending response');
    const response = { 
      token, 
      isAdmin: user.isAdmin,
      privateKey
    };
    
    console.log('Response data:', {
      token: token ? 'present' : 'missing',
      isAdmin: user.isAdmin,
      privateKey: privateKey ? 'present' : 'missing',
      privateKeyLength: privateKey ? privateKey.length : 0
    });
    
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Verification attempt with token:', token ? 'present' : 'missing');
    
    if (!token) {
      return res.json({ valid: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('User not found for token');
      return res.json({ valid: false });
    }

    console.log('Token verified successfully, isAdmin:', user.isAdmin);
    res.json({ valid: true, isAdmin: user.isAdmin });
  } catch (error) {
    console.error('Token verification error:', error);
    res.json({ valid: false });
  }
});

module.exports = router; 