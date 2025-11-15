import { decryptMessage, compareHash } from "../utils/encryption.js";

/**
 * Middleware to decrypt messages for the recipient
 * This should only be used when retrieving messages for display
 */
export const decryptMessages = async (req, res, next) => {
  try {
    // This middleware would be used to decrypt messages
    // In a real implementation, you would need to securely manage decryption keys
    next();
  } catch (error) {
    console.error('Message decryption middleware error:', error);
    next();
  }
};

/**
 * Decrypt a single message for authorized users only
 * @param {Object} message - The message object with encrypted content
 * @param {string} userId - The ID of the user requesting decryption
 * @param {string} decryptionKey - The decryption key (must be securely provided)
 * @returns {Object} The decrypted message or null if user is not authorized
 */
export const decryptSingleMessage = async (message, userId, decryptionKey) => {
  try {
    // Verify user is authorized to decrypt this message
    if (String(message.from) !== String(userId) && String(message.to) !== String(userId)) {
      throw new Error('User not authorized to decrypt this message');
    }

    // Verify the decryption key matches the stored hash
    const isValidKey = await compareHash(decryptionKey, message.contentKeyHash);
    if (!isValidKey) {
      throw new Error('Invalid decryption key');
    }

    // Decrypt the message content
    const decryptedContent = decryptMessage(message.encryptedContent, decryptionKey);
    
    // Return message with decrypted content
    return {
      ...message.toObject ? message.toObject() : message,
      text: decryptedContent,
      decrypted: true
    };
  } catch (error) {
    console.error('Message decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
};