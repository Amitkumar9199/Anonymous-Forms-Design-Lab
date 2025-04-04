import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  DialogActions
} from '@mui/material';
import axios from 'axios';

const SubmitForm = () => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { token } = useAuth();

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
      setSuccess(true);
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

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Submit Anonymous Response
          </Typography>
          
          {hasSubmitted && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You have already submitted a form. Only one submission is allowed per user.
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Form submitted successfully!
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
        </Paper>
      </Box>

      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle>Save Your Private Key</DialogTitle>
        <DialogContent>
          <Typography>
            Please save this private key securely. You will need it to verify your submission later.
          </Typography>
          <TextField
            fullWidth
            value={privateKey}
            margin="normal"
            InputProps={{
              readOnly: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubmitForm; 