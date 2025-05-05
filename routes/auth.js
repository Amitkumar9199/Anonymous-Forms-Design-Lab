const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateKeyPair } = require('../services/crypto');
const fs = require('fs');
const path = require('path');

// Add middleware to log all requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    console.log('Signup attempt with data:', JSON.stringify(req.body));
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      console.log('Missing required fields for signup');
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists with email:', email);
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Generate key pair for the user
    const keyPair = generateKeyPair();
    
    // Create new user with public key
    const user = new User({
      name,
      email,
      password,
      publicKey: keyPair.publicKey,
      isAdmin: email === 'admin@example.com' && name.toLowerCase().includes('admin')
    });
    
    await user.save();
    console.log('User registered successfully:', user.email);
    
    // Save the public key to a file in userKeys directory
    const userKeysDir = path.join(__dirname, '../userKeys');
    
    // Create the userKeys directory if it doesn't exist
    if (!fs.existsSync(userKeysDir)) {
      fs.mkdirSync(userKeysDir, { recursive: true });
    }
    
    const publicKeyFilePath = path.join(userKeysDir, `${email}.pub`);
    fs.writeFileSync(publicKeyFilePath, keyPair.publicKey);
    console.log(`Public key saved to: ${publicKeyFilePath}`);
    
    // Generate token for immediate login
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Error during registration',
      error: error.message 
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt with email:', req.body.email);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Special admin check for admin@example.com
    if (email === 'admin@example.com' && user.name.toLowerCase().includes('admin') && !user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }

    let privateKey = null;
    
    // Generate public/private key if it doesn't exist
    if (!user.publicKey) {
      const keyPair = generateKeyPair();
      user.publicKey = keyPair.publicKey;
      privateKey = keyPair.privateKey;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'your-secret-key-for-development',
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: {
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      },
      privateKey
    });
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
    
    if (!token) {
      return res.json({ valid: false });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-for-development');
      
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.json({ valid: false });
      }
      
      // Extra check for admin@example.com to ensure admin privileges
      if (user.email === 'admin@example.com' && user.name.toLowerCase().includes('admin') && !user.isAdmin) {
        user.isAdmin = true;
        await user.save();
      }

      res.json({ 
        valid: true, 
        isAdmin: user.isAdmin,
        user: {
          name: user.name,
          email: user.email
        }
      });
    } catch (jwtError) {
      return res.json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.json({ valid: false });
  }
});

module.exports = router; 