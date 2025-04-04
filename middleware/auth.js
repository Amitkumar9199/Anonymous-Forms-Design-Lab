// middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Get token from headers - check both formats
  let token = req.header('x-auth-token');
  
  // If not found, try the Authorization header (Bearer token)
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  // Check if no token
  if (!token) {
    console.log('No auth token found in request headers');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  console.log('Processing token:', token.substring(0, 20) + '...');

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Set req.user with the data from the token
    req.user = {
      id: decoded.userId,
      isAdmin: decoded.isAdmin
    };
    console.log('User authenticated:', req.user);
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.isAdmin) {
      next();
    } else {
      res.status(403).json({ message: 'Admin access required' });
    }
  });
};

module.exports = { auth, adminAuth };
