const crypto = require('crypto');

/**
 * Generates a more reliable seed for randomness by incorporating:
 * - Current timestamp (high precision)
 * - Process information
 * - Random bytes from crypto.randomBytes
 */
const generateEnhancedRandomness = () => {
  // Get high-resolution time components
  const hrtime = process.hrtime();
  const timestamp = new Date().getTime();
  const nanoseconds = hrtime[1];
  
  // Get some system info for added entropy
  const pid = process.pid;
  const memoryUsage = JSON.stringify(process.memoryUsage());
  
  // Generate 16 bytes of cryptographically secure random data
  const randomBytes = crypto.randomBytes(16).toString('hex');
  
  // Combine all sources of entropy
  const entropyString = `${timestamp}-${nanoseconds}-${pid}-${memoryUsage}-${randomBytes}`;
  
  // Hash the combined entropy to get a uniform distribution
  return crypto.createHash('sha512').update(entropyString).digest('hex');
};

/**
 * Selects a modulus length with enhanced randomness
 */
const getRandomModulusLength = () => {
  // Get enhanced randomness
  const randomHex = generateEnhancedRandomness();
  
  // Convert first 8 chars of hex to a number between 0 and 1
  const randomValue = parseInt(randomHex.slice(0, 8), 16) / 0xffffffff;
  
  // Scale to desired range (2048-4096)
  return Math.floor(randomValue * (4096 - 2048 + 1)) + 2048;
};

const generateKeyPair = () => {
  console.log('Generating RSA key pair with enhanced randomness...');
  
  // Use enhanced random source to select modulus length
  const modulusLength = getRandomModulusLength();
  console.log('Using time-seeded random modulus length:', modulusLength);
  
  // Generate completely random key pair each time
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: modulusLength,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Format keys
  const formattedPublicKey = publicKey.toString().trim();
  const formattedPrivateKey = privateKey.toString().trim();
  
  // Log key details
  console.log('Public Key length:', formattedPublicKey.length);
  console.log('Private Key length:', formattedPrivateKey.length);
  
  // Log key content (skip header)
  const publicKeyContent = formattedPublicKey.split('\n')[1];
  const privateKeyContent = formattedPrivateKey.split('\n')[1];
  
  console.log('Public Key content preview:', publicKeyContent.substring(0, 50) + '...');
  console.log('Private Key content preview:', privateKeyContent.substring(0, 50) + '...');

  return {
    publicKey: formattedPublicKey,
    privateKey: formattedPrivateKey
  };
};

/**
 * Encrypts data using the public key
 */
const encryptWithPublicKey = (data, publicKey) => {
  try {
    console.log('Encrypting data with public key...');
    
    // Convert data to buffer if it's a string
    const dataBuffer = Buffer.from(data);
    
    // Encrypt the data with the public key
    // Note: RSA can only encrypt data that is smaller than the key size
    // For larger data, we'd need to use hybrid encryption (AES + RSA)
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      dataBuffer
    );
    
    // Return base64 encoded encrypted data
    const encryptedBase64 = encrypted.toString('base64');
    console.log('Encryption successful, result length:', encryptedBase64.length);
    return encryptedBase64;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

/**
 * Decrypts data using the private key
 */
const decryptWithPrivateKey = (encryptedData, privateKey) => {
  try {
    console.log('Decrypting data with private key...');
    
    // Validate and fix private key format if needed
    let formattedPrivateKey = privateKey;
    
    // Make sure there are line breaks in the key
    if (!privateKey.includes('\n')) {
      console.log('Reformatting private key for decryption...');
      formattedPrivateKey = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    }
    
    // Convert base64 encrypted data to buffer
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
    // Decrypt the data with the private key
    const decrypted = crypto.privateDecrypt(
      {
        key: formattedPrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      encryptedBuffer
    );
    
    // Return the decrypted data as string
    const decryptedText = decrypted.toString();
    console.log('Decryption successful, result length:', decryptedText.length);
    return decryptedText;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

// Keep the original functions for backward compatibility
const signData = (data, privateKey) => {
  try {
    console.log('Signing data...');
    
    // Validate and fix private key format if needed
    let formattedPrivateKey = privateKey;
    
    // Make sure there are line breaks in the key
    if (!privateKey.includes('\n')) {
      console.log('Reformatting private key for signing...');
      formattedPrivateKey = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    }
    
    // Validate private key format
    if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----') || 
        !formattedPrivateKey.includes('-----END PRIVATE KEY-----')) {
      console.error('Invalid private key format');
      throw new Error('Invalid private key format');
    }
    
    // Create a signer with SHA256
    const signer = crypto.createSign('SHA256');
    signer.update(data);
    
    // Sign the data with the private key
    const signature = signer.sign(formattedPrivateKey, 'base64');
    console.log('Signature generated:', signature.substring(0, 50) + '...');
    return signature;
  } catch (error) {
    console.error('Error signing data:', error);
    throw error;
  }
};

const verify = (data, signature, publicKey) => {
  try {
    console.log('Verifying signature...');
    
    // Validate public key format
    if (!publicKey.includes('-----BEGIN PUBLIC KEY-----') || !publicKey.includes('-----END PUBLIC KEY-----')) {
      console.error('Invalid public key format');
      return false;
    }
    
    // Validate signature format
    if (!signature || typeof signature !== 'string') {
      console.error('Invalid signature format');
      return false;
    }
    
    // Create a verifier with SHA256
    const verifier = crypto.createVerify('SHA256');
    verifier.update(data);
    
    // Verify the signature with the public key
    const result = verifier.verify(publicKey, signature, 'base64');
    console.log('Verification result:', result);
    return result;
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
};

module.exports = {
  generateKeyPair,
  signData,
  verify,
  encryptWithPublicKey,
  decryptWithPrivateKey
}; 