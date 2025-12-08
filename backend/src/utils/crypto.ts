import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const AUTH_TAG_LENGTH = 16;
const KEY = Buffer.from(env.CERTIFICATE_ENCRYPTION_KEY || '00'.repeat(32), 'hex');

if (KEY.length !== 32) {
    throw new Error('Invalid CERTIFICATE_ENCRYPTION_KEY length. Must be a 32-byte hex string.');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param text The plaintext to encrypt.
 * @returns A base64 encoded string containing the iv, auth tag, and encrypted text.
 */
export const encrypt = (text: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data into a single buffer
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString('base64');
};

/**
 * Decrypts an AES-256-GCM encrypted string.
 * @param encryptedText The base64 encoded string from the encrypt function.
 * @returns The decrypted plaintext string.
 */
export const decrypt = (encryptedText: string): string => {
    try {
        const combined = Buffer.from(encryptedText, 'base64');

        const iv = combined.slice(0, IV_LENGTH);
        const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error("Decryption failed:", error);
        // It's generally safer to return a generic error than the specific crypto error
        throw new Error("Failed to decrypt data. The data may be corrupt or the key may be incorrect.");
    }
};
