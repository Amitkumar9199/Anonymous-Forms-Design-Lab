import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openKeyDialog, setOpenKeyDialog] = useState(false);
  const [keys, setKeys] = useState({ publicKey: '', privateKey: '' });
  const [copySuccess, setCopySuccess] = useState({ publicKey: false, privateKey: false });
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    // Reset error
    setError('');

    // Check if all fields are filled
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await signup(name, email, password);
      
      // Check if we received public and private keys
      if (response.publicKey && response.privateKey) {
        setKeys({
          publicKey: response.publicKey,
          privateKey: response.privateKey
        });
        
        // Open the key dialog
        setOpenKeyDialog(true);
      } else {
        // If no keys, just navigate to submission page
        navigate('/submit');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || 'Failed to create account. Please try again.');
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (keyType) => {
    navigator.clipboard.writeText(keys[keyType])
      .then(() => {
        // Set copy success for this key type
        setCopySuccess(prev => ({ ...prev, [keyType]: true }));
        
        // Reset the success message after 2 seconds
        setTimeout(() => {
          setCopySuccess(prev => ({ ...prev, [keyType]: false }));
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  const handleCloseKeyDialog = () => {
    setOpenKeyDialog(false);
    setLoading(false);
    navigate('/submit');
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Create Account
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              autoFocus
            />
            
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
            />
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container justifyContent="center">
              <Grid item>
                <Typography variant="body2">
                  Already have an account?{' '}
                  <Link to="/" style={{ textDecoration: 'none' }}>
                    Sign in
                  </Link>
                </Typography>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
      
      {/* Key Pair Dialog */}
      <Dialog 
        open={openKeyDialog} 
        onClose={handleCloseKeyDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Your Encryption Keys
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Important: Save your private key securely now. This is the only time it will be shown to you.
          </Alert>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Public Key
          </Typography>
          <Box 
            sx={{ 
              p: 2, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 1,
              maxHeight: '150px',
              overflow: 'auto',
              position: 'relative',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {keys.publicKey}
            <Tooltip title={copySuccess.publicKey ? "Copied!" : "Copy to clipboard"}>
              <IconButton
                onClick={() => handleCopyToClipboard('publicKey')}
                sx={{ position: 'absolute', top: 2, right: 2 }}
                color={copySuccess.publicKey ? "success" : "default"}
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Private Key
          </Typography>
          <Box 
            sx={{ 
              p: 2, 
              backgroundColor: '#f5f5f5', 
              borderRadius: 1,
              maxHeight: '200px',
              overflow: 'auto',
              position: 'relative',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {keys.privateKey}
            <Tooltip title={copySuccess.privateKey ? "Copied!" : "Copy to clipboard"}>
              <IconButton
                onClick={() => handleCopyToClipboard('privateKey')}
                sx={{ position: 'absolute', top: 2, right: 2 }}
                color={copySuccess.privateKey ? "success" : "default"}
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseKeyDialog} variant="contained" color="primary">
            I've Saved My Keys
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Signup; 