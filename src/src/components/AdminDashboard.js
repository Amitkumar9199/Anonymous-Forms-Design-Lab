import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AppBar,
  Toolbar
} from '@mui/material';
import axios from 'axios';

const AdminDashboard = () => {
  const [responses, setResponses] = useState([]);
  const [submitters, setSubmitters] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [privateKey, setPrivateKey] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    fetchResponses();
    fetchSubmitters();
  }, []);

  const fetchResponses = async () => {
    try {
      console.log('Fetching responses...');
      const response = await axios.get('/api/form/responses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Raw response data:', response.data);
      
      // Log each response's structure
      response.data.forEach((resp, index) => {
        console.log(`Response ${index + 1}:`, {
          id: resp._id,
          content: resp.content,
          hasPublicKey: !!resp.publicKey,
          hasSignature: !!resp.signature,
          verified: resp.verified
        });
      });
      
      setResponses(response.data);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const fetchSubmitters = async () => {
    try {
      console.log('Fetching submitters...');
      const response = await axios.get('/api/form/submitters', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Submitters fetched:', response.data);
      setSubmitters(response.data);
    } catch (error) {
      console.error('Error fetching submitters:', error);
    }
  };

  const handleVerify = async () => {
    if (!selectedResponse || !privateKey) return;

    try {
      console.log('Verifying response:', selectedResponse._id);
      console.log('Response details:', {
        id: selectedResponse._id,
        content: selectedResponse.content.substring(0, 50),
        hasPublicKey: !!selectedResponse.publicKey,
        publicKeyLength: selectedResponse.publicKey ? selectedResponse.publicKey.length : 0,
        hasSignature: !!selectedResponse.signature,
        signatureLength: selectedResponse.signature ? selectedResponse.signature.length : 0
      });
      console.log('Using private key:', privateKey.substring(0, 50) + '...');
      console.log('Private key length:', privateKey.length);
      
      const response = await axios.post(
        '/api/form/verify',
        {
          responseId: selectedResponse._id,
          privateKey
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Verification response:', response.data);
      setVerificationResult(response.data);
      
      if (response.data.verified) {
        // Refresh the responses list immediately after successful verification
        await fetchResponses();
        // Close the dialog
        setShowDialog(false);
        // Clear the private key
        setPrivateKey('');
        // Clear the selected response
        setSelectedResponse(null);
      }
    } catch (error) {
      console.error('Error verifying response:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      setVerificationResult({ verified: false, message: 'Verification failed' });
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Admin Dashboard
          </Typography>

          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Registered Users
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Admin Status</TableCell>
                    <TableCell>Has Submitted</TableCell>
                    <TableCell>Submissions</TableCell>
                    <TableCell>Last Submission</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submitters.map((submitter) => (
                    <TableRow key={submitter._id}>
                      <TableCell>{submitter.email}</TableCell>
                      <TableCell>{submitter.isAdmin ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{submitter.hasSubmitted ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{submitter.submissionCount || 0}</TableCell>
                      <TableCell>{submitter.lastSubmissionAt ? new Date(submitter.lastSubmissionAt).toLocaleString() : 'Never'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Responses
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Content</TableCell>
                    <TableCell>Public Key</TableCell>
                    <TableCell>Signature</TableCell>
                    <TableCell>Verified</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response._id}>
                      <TableCell>{response.content}</TableCell>
                      <TableCell>{response.publicKey ? response.publicKey.substring(0, 50) + '...' : 'N/A'}</TableCell>
                      <TableCell>{response.signature ? response.signature.substring(0, 50) + '...' : 'N/A'}</TableCell>
                      <TableCell>{response.verified ? 'Yes' : 'No'}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setSelectedResponse(response);
                            setShowDialog(true);
                            setVerificationResult(null);
                          }}
                          disabled={response.verified}
                        >
                          {response.verified ? 'Verified' : 'Verify'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
          <DialogTitle>Verify Response</DialogTitle>
          <DialogContent>
            {verificationResult && (
              <Alert severity={verificationResult.verified ? 'success' : 'error'} sx={{ mb: 2 }}>
                {verificationResult.message}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Private Key"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              margin="normal"
              multiline
              rows={4}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowDialog(false);
              setPrivateKey('');
              setVerificationResult(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleVerify} color="primary">
              Verify
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default AdminDashboard; 