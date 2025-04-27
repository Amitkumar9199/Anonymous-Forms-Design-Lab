import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import SubmitForm from './components/SubmitForm';
import AdminDashboard from './components/AdminDashboard';
import ResponsesPage from './components/ResponsesPage';
import VerifyResponsePage from './components/VerifyResponsePage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  console.log('PrivateRoute - isAuthenticated:', isAuthenticated);
  console.log('PrivateRoute - isAdmin:', isAdmin);
  console.log('PrivateRoute - adminOnly:', adminOnly);
  
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/" />;
  }
  
  if (adminOnly && !isAdmin) {
    console.log('Not admin, redirecting to submit');
    return <Navigate to="/submit" />;
  }
  
  console.log('Access granted');
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route 
              path="/submit" 
              element={
                <PrivateRoute>
                  <SubmitForm />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/responses" 
              element={
                <PrivateRoute>
                  <ResponsesPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/verify" 
              element={
                <PrivateRoute>
                  <VerifyResponsePage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <PrivateRoute adminOnly>
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 