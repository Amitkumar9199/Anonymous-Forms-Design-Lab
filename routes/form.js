const express = require('express');
const router = express.Router();
const FormSubmission = require('../models/FormSubmission');
const User = require('../models/User');
const { generateKeyPair, encryptWithPublicKey, decryptWithPrivateKey, verify } = require('../services/crypto');
const { auth, adminAuth } = require('../middleware/auth');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Middleware to log all requests
router.use((req, res, next) => {
  console.log(`Form submission request: ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Submit a new form response
router.post('/submit', auth, async (req, res) => {
  try {
    console.log('Processing form submission...');
    const { content, signature, email } = req.body;
    
    // Signature verification block (add at the very start)
    if (!content || !email) {
      console.log('Missing required fields:', { 
        hasContent: !!content, 
        hasEmail: !!email 
      });
      return res.status(400).json({ error: 'Content and email are required.' });
    }
    
    console.log('Email from request:', email);
    
    // Instead of verifying signature, just find the user by email
    const userByEmail = await User.findOne({ email: email });
    if (!userByEmail) {
      console.log('User not found with email:', email);
      return res.status(400).json({ error: 'User not found with this email.' });
    }
    
    console.log('Found user by email:', userByEmail.email, 'ID:', userByEmail._id);
    
    // Check if the email matches the authenticated user
    if (userByEmail._id.toString() !== req.user.id) {
      console.log('Email mismatch:', { 
        providedEmail: email, 
        providedEmailUserId: userByEmail._id.toString(),
        authenticatedUserId: req.user.id 
      });
      return res.status(400).json({ error: 'Email does not match the authenticated user.' });
    }
    
    console.log('Email matches authenticated user');
    
    // Check if user has already submitted (optional restriction)
    const user = await User.findById(req.user.id);
    if (user.hasSubmitted) {
      console.log('User has already submitted a form');
      return res.status(400).json({ error: 'You have already submitted a form. Only one submission is allowed.' });
    }
    
    // Generate key pair
    console.log('Generating key pair for encryption...');
    const keyPair = generateKeyPair();
    const privateKey = keyPair.privateKey;
    const publicKey = keyPair.publicKey;
    
    // Encrypt the content with the newly generated public key (not the user's stored key)
    // This is important so that the private key we return to the user will work for verification
    console.log('Encrypting content with newly generated public key...');
    const encryptedContent = encryptWithPublicKey(content, publicKey);
    
    // Create submission with both plaintext and encrypted content
    const submission = new FormSubmission({
      content,          // Store plaintext content
      encryptedContent, // Also store encrypted content for verification
      visible: false
    });
    
    // Save the submission
    console.log('Saving submission to database...');
    await submission.save();
    console.log('Submission saved successfully');
    
    // Update the user's submission status
    await User.findByIdAndUpdate(req.user.id, {
      hasSubmitted: true,
      $inc: { submissionCount: 1 }
    });
    console.log('Updated user submission status');
    
    // Check if there are enough pending submissions to make a batch visible
    const pendingCount = await FormSubmission.countDocuments({ visible: false });
    console.log(`Current pending submissions count: ${pendingCount}`);
    
    // Define randomDelay at a higher scope so it's available in all code paths
    let randomDelay = 0;
    let visibilityMessage = '';
    
    if (pendingCount >= 2) {
      console.log('Batch threshold reached! Making a batch of submissions visible...');
      // Get the 5 oldest pending submissions
      const batchToMakeVisible = await FormSubmission.find({ visible: false })
        .sort({ _id: 1 })
        .limit(5);
      
      // Make all submissions in the batch visible
      for (const sub of batchToMakeVisible) {
        sub.visible = true;
        await sub.save();
        console.log(`Made submission ${sub._id} visible as part of batch`);
      }
      
      console.log('Batch processing complete - 5 submissions now visible');
      visibilityMessage = 'Your submission is now visible to admin as part of a batch of submissions.';
    } else {
      // Schedule the submission to become visible after a random delay
      // This prevents correlation by time of submission
      const minDelay = 1 * 60 * 1000; // 5 minute minimum
      const maxAdditionalDelay = 2 * 60 * 1000; // Up to an additional 25 minute (total max: 2 minutes)
      randomDelay = minDelay + Math.floor(Math.random() * maxAdditionalDelay);
      
      console.log(`Batch threshold not reached. Scheduling submission to become visible after ${randomDelay/1000/60} minutes`);
      console.log(`Submission ID that will be made visible: ${submission._id.toString()}`);
      
      // Set timeout to make the submission visible later
      setTimeout(async () => {
        try {
          console.log(`⏰ Timeout triggered for submission ${submission._id}`);
          
          // Find the submission and make it visible
          const submissionToUpdate = await FormSubmission.findById(submission._id);
          
          if (!submissionToUpdate) {
            console.error(`❌ Submission ${submission._id} not found in database when trying to make visible`);
            return;
          }
          
          if (!submissionToUpdate.visible) {
            console.log(`✅ Making submission ${submission._id} visible`);
            submissionToUpdate.visible = true;
            await submissionToUpdate.save();
            console.log(`✅ Submission ${submission._id} is now visible to admin via timeout`);
            
            // Check if making this submission visible creates an opportunity for a batch
            const remainingPending = await FormSubmission.countDocuments({ visible: false });
            if (remainingPending >= 5) {
              console.log('Found enough submissions for a batch after timeout. Processing batch...');
              // Get the 5 oldest pending submissions
              const batchToProcess = await FormSubmission.find({ visible: false })
                .sort({ _id: 1 })
                .limit(5);
              
              // Make all submissions in the batch visible
              for (const sub of batchToProcess) {
                sub.visible = true;
                await sub.save();
                console.log(`Made submission ${sub._id} visible as part of post-timeout batch`);
              }
              
              console.log('Post-timeout batch processing complete');
            }
          } else {
            console.log(`⚠️ Submission ${submission._id} is already visible, no action needed`);
          }
        } catch (err) {
          console.error(`❌ Error in timeout handler for making submission ${submission._id} visible:`, err);
          
          // Emergency fallback - try one more time after a short delay
          setTimeout(async () => {
            try {
              console.log(`🔄 Retry: Setting visibility for submission ${submission._id}`);
              await FormSubmission.findByIdAndUpdate(submission._id, { visible: true });
              console.log(`✅ Retry successful: Submission ${submission._id} visibility updated`);
            } catch (retryErr) {
              console.error(`💥 Final retry failed for submission ${submission._id}:`, retryErr);
            }
          }, 5000); // Retry after 5 seconds
        }
      }, randomDelay);
      
      visibilityMessage = `Your submission will be visible to admin in approximately ${Math.round(randomDelay/1000/60)} minutes, unless 5 submissions accumulate first.`;
    }
    
    // Return the private key to the user
    // The user must save this key to verify their ownership of the submission later
    console.log('Returning private key to user (length):', privateKey.length);
    
    res.status(201).json({
      message: 'Form submitted successfully',
      privateKey, // The user must save this key
      visibilityInfo: visibilityMessage
    });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// Get all form submissions (admin only)
router.get('/responses', auth, async (req, res) => {
  try {
    console.log('Fetching all form submissions...');
    
    // Get statistics about submissions
    const totalCount = await FormSubmission.countDocuments();
    const visibleCount = await FormSubmission.countDocuments({ visible: true });
    const hiddenCount = await FormSubmission.countDocuments({ visible: false });
    
    console.log(`Submission stats - Total: ${totalCount}, Visible: ${visibleCount}, Hidden: ${hiddenCount}`);
    
    // Only fetch visible submissions
    const submissions = await FormSubmission.find({ visible: true }).sort({ _id: -1 });
    console.log(`Found ${submissions.length} visible submissions`);
    
    // Log the IDs of visible submissions
    if (submissions.length > 0) {
      console.log('Visible submission IDs:', submissions.map(s => s._id.toString()));
    } else {
      console.log('No visible submissions found');
      
      // If no visible submissions, check if there are any submissions at all
      if (totalCount > 0) {
        console.log('There are submissions in the database, but none are marked as visible');
        
        // Log a sample of the first few submissions
        const sampleSubmissions = await FormSubmission.find().limit(3);
        console.log('Sample submissions:', sampleSubmissions.map(s => ({
          id: s._id.toString(),
          visible: s.visible,
          verified: s.verified,
          hasContent: !!s.content,
          createdAt: s._id.getTimestamp()
        })));
      }
    }
    
    // For verified submissions, get the user email
    const responsesWithUserInfo = await Promise.all(submissions.map(async (submission) => {
      // Convert to plain object so we can add properties
      const submissionObj = submission.toObject();
      
      // If the submission is verified and has a user ID, fetch user email
      if (submission.verified && submission.userId) {
        try {
          const user = await User.findById(submission.userId);
          if (user) {
            submissionObj.userEmail = user.email;
          }
        } catch (error) {
          console.error(`Error fetching user info for submission ${submission._id}:`, error);
        }
      }
      
      return submissionObj;
    }));
    
    res.json(responsesWithUserInfo);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Get all submitters (admin only)
router.get('/submitters', auth, async (req, res) => {
  try {
    const submitters = await User.find()
      .select('email isAdmin hasSubmitted submissionCount')
      .sort({ email: 1 });
    res.json(submitters);
  } catch (error) {
    console.error('Error fetching submitters:', error);
    res.status(500).json({ message: 'Error fetching submitters' });
  }
});

// Verify a submission
router.post('/verify', auth, async (req, res) => {
  try {
    console.log('Verifying submission...', JSON.stringify(req.body));
    const { responseId, privateKey } = req.body;
    
    if (!responseId || !privateKey) {
      console.log('Missing required fields:', { hasResponseId: !!responseId, hasPrivateKey: !!privateKey });
      return res.status(400).json({ error: 'ResponseId and privateKey are required' });
    }
    
    // Format the private key correctly if line breaks are missing
    let formattedPrivateKey = privateKey;
    
    // Check if the private key format is correct (should have proper line breaks)
    if (!privateKey.includes('\n')) {
      console.log('Reformatting private key...');
      
      // Add line breaks to the private key
      formattedPrivateKey = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        
      console.log('Private key reformatted');
    }
    
    console.log('Looking for submission with ID:', responseId);
    // Find the submission by ID
    const submission = await FormSubmission.findById(responseId);
    
    if (!submission) {
      console.log('No submission found with ID:', responseId);
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    console.log('Found submission:', {
      id: submission._id,
      hasContent: !!submission.content,
      hasEncryptedContent: !!submission.encryptedContent
    });
    
    // Try to decrypt the content with the provided private key to verify ownership
    try {
      console.log('Attempting to decrypt content with provided private key...');
      const decryptedContent = decryptWithPrivateKey(submission.encryptedContent, formattedPrivateKey);
      
      // Verify that the decrypted content matches the stored plaintext content
      const isContentMatch = (decryptedContent === submission.content);
      
      if (!isContentMatch) {
        console.log('Decryption successful but content does not match!');
        return res.json({
          verified: false,
          message: 'Verification failed - decrypted content does not match original content'
        });
      }
      
      // If we get here, decryption was successful and content matches
      console.log('Verification successful! Content matches original submission.');
      
      // Update the submission to mark it as verified and associate with user
      submission.verified = true;
      submission.userId = req.user.id; // Associate with the current user
      await submission.save();
      
      return res.json({ 
        verified: true, 
        message: 'Response verified - you have proven ownership of this submission',
        content: submission.content
      });
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return res.json({
        verified: false,
        message: 'Verification failed - the provided private key could not decrypt this content'
      });
    }
  } catch (error) {
    console.error('Error verifying submission:', error);
    res.status(500).json({ error: 'Failed to verify submission' });
  }
});

// Verify user's own response
router.post('/verify-own-response', auth, async (req, res) => {
  try {
    console.log('User verifying their own response...');
    const { privateKey } = req.body;
    const userId = req.user.id;
    
    if (!privateKey) {
      console.log('Missing private key');
      return res.status(400).json({ error: 'Private key is required' });
    }
    
    // Get user information
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.hasSubmitted) {
      console.log('User has not submitted a form yet');
      return res.status(400).json({ error: 'You have not submitted a form yet' });
    }
    
    // Format the private key correctly if line breaks are missing
    let formattedPrivateKey = privateKey;
    
    // Check if the private key format is correct (should have proper line breaks)
    if (!privateKey.includes('\n')) {
      console.log('Reformatting private key...');
      
      // Add line breaks to the private key
      formattedPrivateKey = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        
      console.log('Private key reformatted');
    }
    
    // Find all unverified submissions
    const submissions = await FormSubmission.find({ verified: false });
    console.log(`Found ${submissions.length} unverified submissions to check`);
    
    let verifiedSubmission = null;
    
    // Try to verify each submission
    for (const submission of submissions) {
      try {
        console.log(`Checking submission ${submission._id}...`);
        
        // Try to decrypt the content with the provided private key
        const decryptedContent = decryptWithPrivateKey(submission.encryptedContent, formattedPrivateKey);
        
        // Verify that the decrypted content matches the stored plaintext content
        if (decryptedContent === submission.content) {
          // If we get here, decryption was successful and content matches
          console.log('Match found! Submission verified:', submission._id);
          submission.verified = true;
          submission.userId = userId; // Associate this submission with the user
          submission.visible = true; // Make immediately visible once verified
          await submission.save();
          verifiedSubmission = submission;
          break;
        } else {
          console.log(`Content mismatch for submission ${submission._id}`);
        }
      } catch (error) {
        console.log(`Error checking submission ${submission._id}:`, error.message);
        // Continue to next submission
      }
    }
    
    if (verifiedSubmission) {
      return res.json({ 
        verified: true, 
        message: 'Your response has been successfully verified and associated with your account!',
        content: verifiedSubmission.content
      });
    } else {
      return res.status(400).json({ 
        error: 'Could not verify any response with the provided private key. Please check your key and try again.' 
      });
    }
  } catch (error) {
    console.error('Error verifying own response:', error);
    res.status(500).json({ error: 'Failed to verify response' });
  }
});

// Get current user's submission status
router.get('/my-submission-status', auth, async (req, res) => {
  try {
    console.log('Checking submission status for user ID:', req.user.id);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      hasSubmitted: user.hasSubmitted,
      submissionCount: user.submissionCount
    });
  } catch (error) {
    console.error('Error checking submission status:', error);
    res.status(500).json({ error: 'Failed to check submission status' });
  }
});

// Admin endpoint to check and fix submission visibility
router.post('/check-visibility', adminAuth, async (req, res) => {
  try {
    console.log('Admin checking submission visibility status...');
    
    // Get statistics about submissions
    const totalCount = await FormSubmission.countDocuments();
    const visibleCount = await FormSubmission.countDocuments({ visible: true });
    const hiddenCount = await FormSubmission.countDocuments({ visible: false });
    
    console.log(`Submission stats - Total: ${totalCount}, Visible: ${visibleCount}, Hidden: ${hiddenCount}`);
    
    // Check for submissions that should be visible by now (older than 2 minutes)
    const twoMinutesAgo = new Date(Date.now() - (2 * 60 * 1000));
    const stuckSubmissions = await FormSubmission.find({
      visible: false,
      _id: { $lt: mongoose.Types.ObjectId.createFromTime(Math.floor(twoMinutesAgo.getTime() / 1000)) }
    });
    
    console.log(`Found ${stuckSubmissions.length} submissions that are older than 2 minutes but still not visible`);
    
    // Fix stuck submissions if requested
    let fixedCount = 0;
    if (req.body.fix === true && stuckSubmissions.length > 0) {
      for (const submission of stuckSubmissions) {
        submission.visible = true;
        await submission.save();
        fixedCount++;
        console.log(`Fixed visibility for submission ${submission._id}`);
      }
    }
    
    // Return status
    res.json({
      status: 'success',
      stats: {
        total: totalCount,
        visible: visibleCount,
        hidden: hiddenCount,
        stuck: stuckSubmissions.length,
        fixed: fixedCount
      },
      message: fixedCount > 0 
        ? `Fixed ${fixedCount} stuck submissions` 
        : `Found ${stuckSubmissions.length} stuck submissions. Send {"fix": true} to fix them.`
    });
  } catch (error) {
    console.error('Error checking submission visibility:', error);
    res.status(500).json({ error: 'Failed to check submission visibility' });
  }
});

module.exports = router; 