const express = require('express');
const router = express.Router();
const FormSubmission = require('../models/FormSubmission');
const User = require('../models/User');
const { generateKeyPair, signData, verify } = require('../services/crypto');
const { auth, adminAuth } = require('../middleware/auth');

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
    const { content } = req.body;
    
    if (!content) {
      console.log('Missing content in submission');
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Check if user has already submitted (optional restriction)
    const user = await User.findById(req.user.id);
    if (user.hasSubmitted) {
      console.log('User has already submitted a form');
      return res.status(400).json({ error: 'You have already submitted a form. Only one submission is allowed.' });
    }
    
    // Generate a unique key pair that doesn't match any existing keys
    console.log('Generating unique key pair for submission...');
    let publicKey, privateKey;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10; // Safety limit on attempts
    
    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      // Generate a new key pair
      const keyPair = generateKeyPair();
      publicKey = keyPair.publicKey;
      privateKey = keyPair.privateKey;
      
      // Check if this public key already exists in the database
      const existingSubmission = await FormSubmission.findOne({ publicKey });
      isUnique = !existingSubmission;
      
      console.log(`Key generation attempt ${attempts}, unique: ${isUnique}`);
    }
    
    if (!isUnique) {
      console.error('Failed to generate a unique key pair after multiple attempts');
      return res.status(500).json({ error: 'Unable to generate a unique cryptographic key' });
    }
    
    // Sign the content with the private key
    console.log('Signing content with private key...');
    const signature = signData(content, privateKey);
    
    // Create a completely anonymous submission
    const submission = new FormSubmission({
      content,
      publicKey,
      signature,
      // Add a "pending" flag to hide new submissions initially
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
    
    if (pendingCount >= 5) {
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
      const minDelay = 1 * 60 * 1000; // 1 minute minimum
      const maxAdditionalDelay = 29 * 60 * 1000; // Up to an additional 1 minute (total max: 2 minutes)
      randomDelay = minDelay + Math.floor(Math.random() * maxAdditionalDelay);
      
      console.log(`Batch threshold not reached. Scheduling submission to become visible after ${randomDelay/1000/60} minutes`);
      
      // Set timeout to make the submission visible later
      setTimeout(async () => {
        try {
          // Check if this submission is already visible (could have been made visible as part of a batch)
          const submissionToUpdate = await FormSubmission.findById(submission._id);
          if (submissionToUpdate && !submissionToUpdate.visible) {
            submissionToUpdate.visible = true;
            await submissionToUpdate.save();
            console.log(`Submission ${submission._id} is now visible to admin via timeout`);
            
            // Check if making this submission visible creates an opportunity for a batch
            const remainingPending = await FormSubmission.countDocuments({ visible: false });
            if (remainingPending >= 5) {
              console.log('After timeout, found enough submissions for a batch. Processing batch...');
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
          }
        } catch (err) {
          console.error('Error in timeout handler for making submission visible:', err);
        }
      }, randomDelay);
      
      visibilityMessage = `Your submission will be visible to admin in approximately ${Math.round(randomDelay/1000/60)} minutes, unless 5 submissions accumulate first.`;
    }
    
    // Return the private key to the user
    // The user must save this key to verify their submission later
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
    // Only fetch visible submissions
    const submissions = await FormSubmission.find({ visible: true }).sort({ _id: -1 });
    console.log(`Found ${submissions.length} visible submissions`);
    
    // Log the first submission for debugging
    if (submissions.length > 0) {
      console.log('First submission public key length:', submissions[0].publicKey.length);
      console.log('First submission signature length:', submissions[0].signature.length);
    }
    
    res.json(submissions);
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
      content: submission.content.substring(0, 50),
      hasPublicKey: !!submission.publicKey,
      hasSignature: !!submission.signature
    });
    
    // Step 1: Verify the original signature using the public key
    console.log('Step 1: Verifying original signature...');
    const isSignatureValid = verify(submission.content, submission.signature, submission.publicKey);
    console.log('Original signature verification result:', isSignatureValid);
    
    // Step 2: Re-sign the content using the provided private key
    console.log('Step 2: Re-signing content with provided private key...');
    let isPrivateKeyValid = false;
    try {
      const newSignature = signData(submission.content, formattedPrivateKey);
      // Compare the new signature with the stored signature
      isPrivateKeyValid = (newSignature === submission.signature);
      console.log('Signature match result:', isPrivateKeyValid);
    } catch (error) {
      console.error('Error re-signing with provided private key:', error);
      return res.status(400).json({ error: 'Invalid private key format' });
    }
    
    // Only mark as verified if both checks pass
    if (isSignatureValid && isPrivateKeyValid) {
      console.log('Verification successful! Updating submission...');
      submission.verified = true;
      await submission.save();
      
      return res.json({ 
        verified: true, 
        message: 'Response verified - signature and private key confirmed' 
      });
    } else {
      return res.json({
        verified: false,
        message: isSignatureValid 
          ? 'Verification failed, the provided private key is wrong' 
          : 'Original signature could not be verified'
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
        
        // Re-sign the content using the provided private key
        const newSignature = signData(submission.content, formattedPrivateKey);
        
        // Compare the new signature with the stored signature
        if (newSignature === submission.signature) {
          console.log('Match found! Submission verified:', submission._id);
          submission.verified = true;
          submission.userId = userId; // Associate this submission with the user
          submission.visible = true; // Make immediately visible once verified
          await submission.save();
          verifiedSubmission = submission;
          break;
        }
      } catch (error) {
        console.log(`Error checking submission ${submission._id}:`, error.message);
        // Continue to next submission
      }
    }
    
    if (verifiedSubmission) {
      return res.json({ 
        verified: true, 
        message: 'Your response has been successfully verified and associated with your account!'
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

module.exports = router; 