import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a random encryption key
 * @returns {string} Random encryption key
 */
export const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypt message content
 * @param {string} message - The message to encrypt
 * @param {string} key - The encryption key
 * @returns {string} Encrypted message
 */
export const encryptMessage = (message, key) => {
  try {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypt message content
 * @param {string} encryptedMessage - The encrypted message
 * @param {string} key - The decryption key
 * @returns {string} Decrypted message
 */
export const decryptMessage = (encryptedMessage, key) => {
  try {
    const algorithm = 'aes-256-cbc';
    const parts = encryptedMessage.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
};

/**
 * Hash a value using bcrypt
 * @param {string} value - The value to hash
 * @returns {string} Hashed value
 */
export const hashValue = async (value) => {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(value, saltRounds);
  } catch (error) {
    console.error('Hashing error:', error);
    throw new Error('Failed to hash value');
  }
};

/**
 * Compare a value with its hash
 * @param {string} value - The value to compare
 * @param {string} hash - The hash to compare against
 * @returns {boolean} Whether the value matches the hash
 */
export const compareHash = async (value, hash) => {
  try {
    return await bcrypt.compare(value, hash);
  } catch (error) {
    console.error('Hash comparison error:', error);
    throw new Error('Failed to compare hash');
  }
};