import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:5000';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [user, setUser] = useState(null);
  const MAX_VERIFICATION_ATTEMPTS = 3;

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      
      try {
        const storedToken = localStorage.getItem('token');
        
        if (storedToken) {
          console.log('Found stored token, verifying...');
          
          // Set token in state and axios headers immediately
          // This prevents API calls from failing during verification
          setToken(storedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          await verifyToken(storedToken);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const verifyToken = async (tokenToVerify) => {
    try {
      console.log('Verifying token...');
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${tokenToVerify}` }
      });
      
      console.log('Token verification response:', response.data);
      
      if (response.data.valid) {
        console.log('Token is valid');
        setToken(tokenToVerify);
        setIsAuthenticated(true);
        setIsAdmin(response.data.isAdmin);
        if (response.data.user) {
          setUser(response.data.user);
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokenToVerify}`;
        // Reset verification attempts on success
        setVerificationAttempts(0);
        return true;
      } else {
        console.log('Token is invalid');
        // Only perform logout if we've exceeded max attempts
        // This prevents logout on transient network issues
        if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
          logout();
        } else {
          setVerificationAttempts(prev => prev + 1);
          console.log(`Token verification failed, attempt ${verificationAttempts + 1}/${MAX_VERIFICATION_ATTEMPTS}`);
        }
        return false;
      }
    } catch (error) {
      console.error('Token verification error:', error);
      
      // Check if this is a network error (could be offline)
      // In that case, we trust the token temporarily
      if (error.message.includes('Network Error')) {
        console.log('Network error during verification, assuming token is valid');
        setToken(tokenToVerify);
        setIsAuthenticated(true);
        // We can't know isAdmin status without verification, so we don't set it
        // The user might see limited functionality until network is restored
        return true;
      }
      
      // Only log out on persistent errors
      if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
        logout();
      } else {
        setVerificationAttempts(prev => prev + 1);
        console.log(`Token verification error, attempt ${verificationAttempts + 1}/${MAX_VERIFICATION_ATTEMPTS}`);
      }
      return false;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login with email:', email);
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      const { token, user, privateKey } = response.data;
      
      if (token) {
        console.log('Login successful, storing token');
        localStorage.setItem('token', token);
        setToken(token);
        setIsAuthenticated(true);
        setIsAdmin(user.isAdmin);
        setUser(user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        if (privateKey) {
          console.log('New user - storing private key');
          localStorage.setItem('privateKey', privateKey);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (name, email, password) => {
    try {
      console.log('Attempting signup with name and email:', name, email);
      const response = await axios.post('/api/auth/signup', { name, email, password });
      console.log('Signup response:', response.data);
      
      const { token, user } = response.data;
      
      if (token) {
        console.log('Signup successful, storing token');
        localStorage.setItem('token', token);
        setToken(token);
        setIsAuthenticated(true);
        setIsAdmin(user.isAdmin);
        setUser(user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('privateKey');
    setToken(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
    setVerificationAttempts(0);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    isAuthenticated,
    isAdmin,
    token,
    user,
    login,
    signup,
    logout,
    loading
  };

  // If still loading, you might want to show a spinner or loading state
  if (loading) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 