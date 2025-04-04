// routes/formRoutes.js
const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Response = require('../models/Response');
const CryptoService = require('../services/CryptoService');
const { auth, adminAuth } = require('../middleware/auth');
const crypto = require('crypto');
const User = require('../models/User');

// Submit a new form (requires authentication)
router.post('/submit', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id; // Get user ID from authenticated user

    // Create anonymous identifier
    const anonymousId = crypto.randomBytes(16).toString('hex');

    const submission = new Submission({
      title,
      content,
      anonymousId,
      userId // Store user ID but keep it separate from the response
    });

    await submission.save();
    res.status(201).json({ message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ message: 'Error submitting form' });
  }
});

// Get all forms (public route)
router.get('/list', async (req, res) => {
  try {
    const submissions = await Submission.find()
      .sort({ createdAt: -1 })
      .select('-anonymousId -userId'); // Don't send anonymous IDs or user IDs to client

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ message: 'Error fetching forms' });
  }
});

// Admin: Get list of users who submitted (requires admin authentication)
router.get('/submissions', adminAuth, async (req, res) => {
  try {
    const submissions = await Submission.find()
      .select('userId anonymousId createdAt')
      .populate('userId', 'email'); // Populate user email if needed

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

// Submit a new response
router.post('/submit', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    // Generate key pair
    const { publicKey, privateKey } = CryptoService.generateKeyPair();

    // Sign the content
    const signature = CryptoService.signData(content, privateKey);

    // Create response
    const response = new Response({
      content,
      signature,
      publicKey,
      userId
    });

    await response.save();

    // Return the private key to the user (this is the only time they'll see it)
    res.status(201).json({
      message: 'Response submitted successfully',
      privateKey // This should be shown to the user and not stored
    });
  } catch (error) {
    console.error('Error submitting response:', error);
    res.status(500).json({ message: 'Error submitting response' });
  }
});

// Admin: Get all responses (without user identification)
router.get('/responses', adminAuth, async (req, res) => {
  try {
    const responses = await Response.find()
      .select('content signature publicKey createdAt')
      .sort({ createdAt: -1 });

    res.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ message: 'Error fetching responses' });
  }
});

// Admin: Get list of users who submitted
router.get('/submitters', adminAuth, async (req, res) => {
  try {
    const submitters = await Response.distinct('userId');
    const users = await User.find({ _id: { $in: submitters } })
      .select('email');

    res.json(users);
  } catch (error) {
    console.error('Error fetching submitters:', error);
    res.status(500).json({ message: 'Error fetching submitters' });
  }
});

// Verify a response with private key
router.post('/verify', adminAuth, async (req, res) => {
  try {
    const { responseId, privateKey } = req.body;
    
    const response = await Response.findById(responseId);
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Verify the signature
    const isVerified = CryptoService.verifySignature(
      response.content,
      response.signature,
      response.publicKey
    );

    // Verify by re-signing
    const newSignature = CryptoService.signData(response.content, privateKey);
    const isMatch = (newSignature === response.signature);

    if (isMatch && isVerified) {
      // Update the response as verified
      response.verified = true;
      await response.save();

      // Get the user's email
      const user = await User.findById(response.userId).select('email');

      res.json({
        verified: true,
        message: 'Response verified - user identity confirmed',
        userEmail: user.email
      });
    } else {
      res.json({
        verified: false,
        message: 'Verification failed'
      });
    }
  } catch (error) {
    console.error('Error verifying response:', error);
    res.status(500).json({ message: 'Error verifying response' });
  }
});

module.exports = router;
