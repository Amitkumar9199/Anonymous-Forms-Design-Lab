const axios = require('axios');
const { expect } = require('chai');
const app = require('../server');
const http = require('http');
require('dotenv').config();
const { setupTestDatabase, cleanupTestDatabase } = require('./setup');

const TEST_PORT = 5002;
const API_URL = `http://localhost:${TEST_PORT}/api`;
let server;

describe('Authentication System', () => {
  let authToken;

  before(async () => {
    // Ensure we're using test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = TEST_PORT;
    
    // Setup test database and create test user
    await setupTestDatabase();
    
    // Start test server
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(TEST_PORT, () => {
        console.log(`Test server started on port ${TEST_PORT}`);
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up test database
    await cleanupTestDatabase();
    
    // Close test server
    await new Promise((resolve) => {
      server.close(() => {
        console.log('Test server closed');
        resolve();
      });
    });
  });

  // Test login
  it('should login and get JWT token', async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@example.com'
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('token');
      authToken = response.data.token;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test form submission with token
  it('should submit form with valid token', async () => {
    try {
      const response = await axios.post(
        `${API_URL}/form/submit`,
        {
          title: 'Test Form',
          content: 'This is a test form submission'
        },
        {
          headers: {
            'x-auth-token': authToken
          }
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data).to.have.property('message', 'Form submitted successfully');
    } catch (error) {
      console.error('Form submission error:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test form submission without token
  it('should reject form submission without token', async () => {
    try {
      await axios.post(`${API_URL}/form/submit`, {
        title: 'Test Form',
        content: 'This should fail'
      });
      throw new Error('Should have failed with 401');
    } catch (error) {
      expect(error.response.status).to.equal(401);
    }
  });

  // Test admin route access
  it('should access admin route with admin token', async () => {
    try {
      const response = await axios.get(`${API_URL}/form/submissions`, {
        headers: {
          'x-auth-token': authToken
        }
      });

      expect(response.status).to.equal(200);
      expect(Array.isArray(response.data)).to.be.true;
    } catch (error) {
      console.error('Admin route error:', error.response?.data || error.message);
      throw error;
    }
  });
}); 