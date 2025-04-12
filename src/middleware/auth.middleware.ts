import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import authService from '../services/auth.service';

/**
 * Authentication middleware for JWT token
 */
export const authenticateJwt = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Authorization token is required' });
            return;
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = authService.verifyJwtToken(token);

        // Set user in request
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email
        };

        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

/**
 * Authentication middleware for API key
 */
export const authenticateApiKey = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            res.status(401).json({ message: 'API key is required' });
            return;
        }

        // Validate API key
        const user = await authService.validateApiKey(apiKey);

        if (!user) {
            res.status(401).json({ message: 'Invalid API key' });
            return;
        }

        // Set user and API key in request
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        req.apiKey = apiKey;

        next();
    } catch (error) {
        res.status(401).json({ message: 'API key validation failed' });
    }
};

/**
 * Authentication middleware for either JWT or API key
 */
export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'] as string;

        // Try API key first
        if (apiKey) {
            const user = await authService.validateApiKey(apiKey);
            if (user) {
                // Set user and API key in request
                req.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email
                };
                req.apiKey = apiKey;

                next();
                return;
            }
        }

        // Fall back to JWT
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = authService.verifyJwtToken(token);

            // Set user in request
            req.user = {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email
            };

            next();
            return;
        }

        // No valid authentication found
        res.status(401).json({ message: 'Authentication required' });
    } catch (error) {
        res.status(401).json({ message: 'Authentication failed' });
    }
};