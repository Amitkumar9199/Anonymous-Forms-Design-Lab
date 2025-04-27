import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  Divider,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  Paper
} from '@mui/material';
import axios from 'axios';

const ResponsesPage = () => {
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const goBack = () => {
    navigate('/submit');
  };

  useEffect(() => {
    fetchResponses();
  }, [token]);

  const fetchResponses = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/form/responses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResponses(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching responses:', err);
      setError('Failed to load responses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Anonymous Responses
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
              All Anonymous Responses
            </Typography>
            <Typography variant="body1" align="center" sx={{ mb: 4 }}>
              These responses have been submitted anonymously by users.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>

          {isLoading ? (
            <Typography align="center">Loading responses...</Typography>
          ) : responses.length === 0 ? (
            <Typography align="center">No responses available yet.</Typography>
          ) : (
            <List>
              {responses.map((response, index) => (
                <React.Fragment key={response._id || index}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <Card variant="outlined" sx={{ width: '100%' }}>
                      <CardContent>
                        <Typography variant="body1">
                          {response.content}
                        </Typography>
                      </CardContent>
                    </Card>
                  </ListItem>
                  {index < responses.length - 1 && <Divider sx={{ my: 2 }} />}
                </React.Fragment>
              ))}
            </List>
          )}

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button
              variant="contained"
              color="primary"
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

export default ResponsesPage; 