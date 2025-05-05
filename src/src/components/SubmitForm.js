import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Grid,
  Snackbar
} from '@mui/material';
import axios from 'axios';
import NavHeader from './NavHeader';
import { KJUR, KEYUTIL } from 'jsrsasign';

const SubmitForm = () => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const viewResponses = () => {
    navigate('/responses');
  };

  const goToVerify = () => {
    navigate('/verify');
  };

  useEffect(() => {
    if (user && user.email) {
      setUserEmail(user.email);
    }
  }, [user]);

  // Check if the user has already submitted a form
  useEffect(() => {
    const checkSubmissionStatus = async () => {
      try {
        const response = await axios.get('/api/form/my-submission-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHasSubmitted(response.data.hasSubmitted);
      } catch (err) {
        console.error('Error checking submission status:', err);
      }
    };

    if (token) {
      checkSubmissionStatus();
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    /* Temporarily make the private key optional while we troubleshoot
    if (!privateKey) {
      setError('Please provide your private key.');
      return;
    }
    */

    try {
      // Only sign if private key is provided
      let signatureB64 = null;
      if (privateKey && privateKey.trim()) {
        try {
          // Sanitize and robustly fix private key formatting
          let formattedKey = privateKey.trim();
          formattedKey = formattedKey.replace(/\r/g, '');
          // Ensure header and footer are present and on their own lines
          if (!formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
            formattedKey = '-----BEGIN PRIVATE KEY-----\n' + formattedKey;
          }
          if (!formattedKey.endsWith('-----END PRIVATE KEY-----')) {
            formattedKey = formattedKey + '\n-----END PRIVATE KEY-----';
          }
          // Ensure newlines after header and before footer
          formattedKey = formattedKey
            .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
            .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
          
          // Get key and sign
          const prvKeyObj = KEYUTIL.getKey(formattedKey);
          const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSA' });
          sig.init(prvKeyObj);
          sig.updateString(content);
          signatureB64 = sig.sign();
        } catch (err) {
          console.warn('Signing error:', err);
          // Continue without signature
        }
      }

      // Send the request with or without signature
      const requestData = { 
        content, 
        email: userEmail 
      };
      
      // Only include signature if we have one
      if (signatureB64) {
        requestData.signature = signatureB64;
      }

      console.log('Sending request data:', requestData);

      const response = await axios.post(
        '/api/form/submit',
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Store the private key from the server response
      setPrivateKey(response.data.privateKey || '');
      setShowDialog(true);
      setContent('');
      if (response.data.visibilityInfo) {
        setSuccess(`Form submitted successfully! ${response.data.visibilityInfo}`);
      } else {
        setSuccess('Form submitted successfully!');
      }
      setHasSubmitted(true);
    } catch (err) {
      console.error('Form submission error:', err);
      
      // Log the complete error response for debugging
      if (err.response) {
        console.error('Error response from server:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        console.error('Specific error message:', err.response.data.error);
      }
      
      // Show specific error message from backend if available
      if (err.response && err.response.data && err.response.data.error) {
        setError(`Server error: ${err.response.data.error}`);
      } else if (err.response && err.response.status === 400 && err.response.data && err.response.data.error && err.response.data.error.includes('already submitted')) {
        setError('You have already submitted a form. Only one submission is allowed.');
        setHasSubmitted(true);
      } else {
        setError(`Submission failed: ${err.message}. Please try again.`);
      }
    }
  };

  const handleCopyPrivateKey = () => {
    navigator.clipboard.writeText(privateKey).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  return (
    <>
      <NavHeader title="Submit Response" />
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Submit Anonymous Response
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {hasSubmitted && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You have already submitted a form. Only one submission is allowed per user.
              </Alert>
            )}
            
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Your Response"
                multiline
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                margin="normal"
                required
                disabled={hasSubmitted}
              />
              <TextField
                fullWidth
                label="Paste Your Private Key"
                multiline
                rows={6}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                margin="normal"
                required
                disabled={hasSubmitted}
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                sx={{ mt: 2 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                sx={{ mt: 3 }}
                disabled={hasSubmitted}
              >
                Submit
              </Button>
            </form>

            {hasSubmitted && (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Already submitted? You can verify your response to associate your email with it.
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={goToVerify}
                  sx={{ mt: 1 }}
                >
                  Verify My Response
                </Button>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Private Key Dialog */}
        <Dialog 
          open={showDialog} 
          onClose={() => setShowDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Save Your Private Key</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              Please save this private key securely. You will need it to verify your submission later.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                size="small"
                onClick={handleCopyPrivateKey}
                sx={{ mr: 2 }}
              >
                Copy to Clipboard
              </Button>
              {copySuccess && (
                <Typography variant="caption" color="success.main">
                  Copied!
                </Typography>
              )}
            </Box>
            <TextField
              fullWidth
              value={privateKey}
              margin="normal"
              multiline
              rows={10}
              InputProps={{
                readOnly: true,
                sx: { 
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }
              }}
              sx={{ mt: 2, mb: 2 }}
            />
            <Alert severity="warning" sx={{ mt: 2 }}>
              This key will only be shown once. Copy it now and store it safely. 
              You will need it to verify your response later.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setShowDialog(false)} 
              color="primary"
              variant="contained"
            >
              I've Saved My Key
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={copySuccess}
          autoHideDuration={3000}
          onClose={() => setCopySuccess(false)}
          message="Private key copied to clipboard!"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Container>
    </>
  );
};

export default SubmitForm; 