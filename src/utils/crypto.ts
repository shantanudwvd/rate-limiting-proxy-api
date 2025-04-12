import crypto from 'crypto';
import { APP_CONFIG } from '../config/app';

/**
 * Generate a secure random string
 * @param length Length of the string
 * @returns Random string
 */
export const generateRandomString = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate an API key with prefix
 * @returns API key
 */
export const generateApiKey = (): string => {
    const randomPart = crypto.randomBytes(20).toString('hex');
    return `${APP_CONFIG.apiKeyPrefix}${randomPart}`;
};

/**
 * Hash a string using SHA-256
 * @param data String to hash
 * @returns Hashed string
 */
export const hashString = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
};