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
  Alert,
  AppBar,
  Toolbar,
  Chip
} from '@mui/material';
import axios from 'axios';

const AdminDashboard = () => {
  const [responses, setResponses] = useState([]);
  const [submitters, setSubmitters] = useState([]);
  const [error, setError] = useState('');
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

  // Helper function to get user email by userId
  const getUserEmailById = (userId) => {
    if (!userId) return 'Anonymous';
    const user = submitters.find(submitter => submitter._id === userId);
    return user ? user.email : 'Unknown User';
  };

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
          verified: resp.verified,
          userId: resp.userId
        });
      });
      
      setResponses(response.data);
    } catch (error) {
      console.error('Error fetching responses:', error);
      setError('Failed to fetch responses. Please try again later.');
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
      setError('Failed to fetch user data. Please try again later.');
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

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

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
              Anonymous Responses
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Content</TableCell>
                    <TableCell>Revealed Identity</TableCell>
                    <TableCell>User Email</TableCell>
                    <TableCell>Submitted At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response._id}>
                      <TableCell>{response.content}</TableCell>
                      <TableCell>
                        {response.verified ? (
                          <Chip 
                            label="Revealed" 
                            color="success" 
                            variant="outlined" 
                          />
                        ) : (
                          <Chip 
                            label="Anonymous" 
                            color="default" 
                            variant="outlined" 
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {response.verified && response.userId ? (
                          getUserEmailById(response.userId)
                        ) : (
                          'Anonymous'
                        )}
                      </TableCell>
                      <TableCell>
                        {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default AdminDashboard; 