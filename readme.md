# DESIGN LABORATORY(CS59001)  - 20CS30003
# Secure Anonymous Submission System

A privacy-focused web application that enables anonymous content submissions with cryptographic verification capabilities. This system allows users to submit content anonymously while maintaining the ability to prove authorship later through a secure cryptographic mechanism.

## Features

- **Anonymous Submissions**: Submit content without revealing your identity
- **Cryptographic Verification**: Prove authorship of your submissions using secure private key verification
- **Privacy-Preserving Mechanisms**:
  - Identity separation through unique cryptographic keys per submission
  - Temporal privacy with random visibility delays
  - Batch processing to prevent timing correlation
  - Comprehensive metadata elimination
- **Secure Authentication**: JWT-based user authentication with role-based access control
- **Administrative Dashboard**: For reviewing and managing submissions
- **Responsive Design**: Works across desktop and mobile devices

## Technology Stack

- **Backend**: Node.js, Express.js, MongoDB with Mongoose
- **Frontend**: React.js with hooks and functional components
- **Authentication**: JWT (JSON Web Tokens)
- **Cryptography**: Node.js crypto module (RSA, SHA-256)
- **Development Tools**: Nodemon, Concurrently, Mocha, Chai

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. **Install MongoDB**
   ```
   sudo apt-get update && sudo apt-get install -y mongodb
   sudo systemctl start mongod
   ```

2. **Install Dependencies**
   ```
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root directory with:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/secure_submissions
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Create Admin Account**
   ```
   node scripts/seedAdmin.js
   ```

### Running the Application

**Development Mode**
```
npm run dev
```
This will start both the backend server and frontend client concurrently.

**Backend Only**
```
npm run server
```

**Frontend Only**
```
npm run client
```

### Testing

```
npm test
```

### Database Management

**Clear Database**
```
node scripts/clearData.js
```

## Usage Guide

1. **Register/Login**: Create an account or log in
2. **Submit Content**: Use the submission form to enter your content
3. **Save Private Key**: When you submit content, you'll receive a private key - save it securely
4. **Verify Authorship**: Use the verification interface to prove you authored a submission by providing the private key

## Security Features

- Asymmetric cryptography with unique key pairs per submission
- Enhanced entropy collection for strong randomness
- Delayed visibility and batch processing to prevent timing analysis
- No storage of private keys on the server
- Comprehensive input validation and error handling
- Protection against timing attacks

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

