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

const SubmitForm = () => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

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

    console.log('Form submission started');
    console.log('Content:', content);
    console.log('Auth token:', token ? 'present' : 'missing');

    try {
      console.log('Sending form submission request');
      const response = await axios.post(
        '/api/form/submit',
        { content },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Form submission response:', response.data);
      setPrivateKey(response.data.privateKey);
      setShowDialog(true);
      setContent('');
      
      // Set success message with visibility information
      if (response.data.visibilityInfo) {
        setSuccess(`Form submitted successfully! ${response.data.visibilityInfo}`);
      } else {
        setSuccess('Form submitted successfully!');
      }
      
      setHasSubmitted(true);
      console.log('Form submitted successfully');
    } catch (err) {
      console.error('Form submission error:', err);
      if (err.response) {
        console.error('Server response:', {
          status: err.response.status,
          data: err.response.data
        });
      }
      
      if (err.response && err.response.status === 400 && err.response.data.error.includes('already submitted')) {
        setError('You have already submitted a form. Only one submission is allowed.');
        setHasSubmitted(true);
      } else {
        setError(err.response?.data?.error || 'Failed to submit form. Please try again.');
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
              rows={6}
              InputProps={{
                readOnly: true,
              }}
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