import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { RegisterUserRequest, LoginRequest, RegisterAppRequest } from '../types';
import { RateLimitStrategy } from '../models/app.model';
import logger from './logger';

/**
 * Validate request
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn(`Validation failed for ${req.method} ${req.originalUrl}: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Validation rules for user registration
 */
export const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*]/)
        .withMessage('Password must contain at least one special character (!@#$%^&*)'),
    validate
];

/**
 * Validation rules for login
 */
export const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate
];

/**
 * Validation rules for app registration
 */
export const appRegistrationValidation = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('App name must be between 3 and 100 characters'),
    body('baseUrl')
        .trim()
        .isURL({
            protocols: ['http', 'https'],
            require_protocol: true,
        })
        .withMessage('Base URL must be a valid URL with http or https protocol'),
    body('rateLimitStrategy')
        .isIn(Object.values(RateLimitStrategy))
        .withMessage(`Invalid rate limit strategy. Must be one of: ${Object.values(RateLimitStrategy).join(', ')}`),
    body('requestLimit')
        .isInt({ min: 1 })
        .withMessage('Request limit must be a positive integer')
        .toInt(),
    body('timeWindowMs')
        .isInt({ min: 1000 })
        .withMessage('Time window must be at least 1000 milliseconds')
        .toInt(),
    body('additionalConfig')
        .optional()
        .isObject()
        .withMessage('Additional config must be an object'),
    validate
];

/**
 * Validate API key format
 */
export const isValidApiKeyFormat = (apiKey: string): boolean => {
    const PREFIX = process.env.API_KEY_PREFIX || 'rlp_';
    return apiKey.startsWith(PREFIX) && apiKey.length >= PREFIX.length + 10;
};

/**
 * Validation rules for updating an app
 */
export const appUpdateValidation = [
    param('id')
        .isUUID()
        .withMessage('Invalid app ID format'),
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('App name must be between 3 and 100 characters'),
    body('baseUrl')
        .optional()
        .trim()
        .isURL({
            protocols: ['http', 'https'],
            require_protocol: true,
        })
        .withMessage('Base URL must be a valid URL with http or https protocol'),
    body('rateLimitStrategy')
        .optional()
        .isIn(Object.values(RateLimitStrategy))
        .withMessage(`Invalid rate limit strategy. Must be one of: ${Object.values(RateLimitStrategy).join(', ')}`),
    body('requestLimit')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Request limit must be a positive integer')
        .toInt(),
    body('timeWindowMs')
        .optional()
        .isInt({ min: 1000 })
        .withMessage('Time window must be at least 1000 milliseconds')
        .toInt(),
    body('additionalConfig')
        .optional()
        .isObject()
        .withMessage('Additional config must be an object'),
    validate
];

/**
 * Validation for app ID parameter
 */
export const appIdValidation = [
    param('id')
        .isUUID()
        .withMessage('Invalid app ID format'),
    validate
];

/**
 * Validation for API key ID parameter
 */
export const apiKeyIdValidation = [
    param('id')
        .isUUID()
        .withMessage('Invalid API key ID format'),
    validate
];

/**
 * Validation for search query
 */
export const searchQueryValidation = [
    query('q')
        .notEmpty()
        .withMessage('Search query is required')
        .isLength({ min: 2 })
        .withMessage('Search query must be at least 2 characters long'),
    validate
];