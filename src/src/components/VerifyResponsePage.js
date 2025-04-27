import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  TextField,
  Paper,
  AppBar,
  Toolbar,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

const VerifyResponsePage = () => {
  const [privateKey, setPrivateKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the user has submitted a form
    const checkSubmissionStatus = async () => {
      try {
        const response = await axios.get('/api/form/my-submission-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHasSubmitted(response.data.hasSubmitted);
      } catch (err) {
        console.error('Error checking submission status:', err);
        setError('Failed to check your submission status. Please try again.');
      }
    };

    if (token) {
      checkSubmissionStatus();
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const goBack = () => {
    navigate('/submit');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!privateKey.trim()) {
      setError('Please enter your private key');
      return;
    }

    setIsVerifying(true);
    setError('');
    setVerificationResult(null);

    try {
      // We'll send the private key to verify the user's response
      const response = await axios.post(
        '/api/form/verify-own-response',
        { privateKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setVerificationResult({
        success: true,
        message: response.data.message || 'Your response has been verified successfully!'
      });
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationResult({
        success: false,
        message: err.response?.data?.error || 'Failed to verify your response. Please check your private key and try again.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Verify Your Response
          </Typography>
          <Button 
            color="inherit" 
            onClick={goBack}
            sx={{ mr: 2 }}
          >
            Back to Form
          </Button>
          <Button 
            color="inherit" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Verify Your Anonymous Response
            </Typography>
            
            {!hasSubmitted ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                You haven't submitted a response yet. Please submit a response before attempting verification.
              </Alert>
            ) : (
              <Typography variant="body1" paragraph align="center">
                Enter the private key you received after submitting your response to verify your authorship.
                Once verified, your email will be associated with your response in the admin dashboard.
              </Typography>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {verificationResult && (
              <Alert 
                severity={verificationResult.success ? "success" : "error"} 
                sx={{ mb: 2 }}
              >
                {verificationResult.message}
              </Alert>
            )}
          </Box>

          <form onSubmit={handleVerify}>
            <TextField
              fullWidth
              label="Your Private Key"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              margin="normal"
              required
              multiline
              rows={4}
              disabled={!hasSubmitted || isVerifying}
              placeholder="Paste your private key here"
            />
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!hasSubmitted || isVerifying}
                sx={{ minWidth: '150px' }}
              >
                {isVerifying ? <CircularProgress size={24} color="inherit" /> : 'Verify Response'}
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={goBack}
            >
              Back to Form
            </Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default VerifyResponsePage; 