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

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      console.log('Found stored token, verifying...');
      verifyToken(storedToken);
    }
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
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokenToVerify}`;
      } else {
        console.log('Token is invalid');
        logout();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      logout();
    }
  };

  const login = async (email) => {
    try {
      console.log('Attempting login with email:', email);
      const response = await axios.post('/api/auth/login', { email });
      console.log('Login response:', response.data);
      
      const { token, isAdmin, privateKey } = response.data;
      
      if (token) {
        console.log('Login successful, storing token');
        localStorage.setItem('token', token);
        setToken(token);
        setIsAuthenticated(true);
        setIsAdmin(isAdmin);
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

  const logout = () => {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('privateKey');
    setToken(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    isAuthenticated,
    isAdmin,
    token,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 