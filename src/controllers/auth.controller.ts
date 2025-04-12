import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { RegisterUserRequest, LoginRequest, AuthRequest } from '../types';

class AuthController {
    /**
     * Register a new user
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const userData: RegisterUserRequest = req.body;

            // Validate input
            if (!userData.username || !userData.email || !userData.password) {
                res.status(400).json({ message: 'Missing required fields' });
                return;
            }

            // Create new user
            const user = await authService.registerUser(userData);

            // Generate JWT token
            const token = authService.generateJwtToken(user);

            // Return user info and token
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to register user' });
        }
    }

    /**
     * Login a user
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const loginData: LoginRequest = req.body;

            // Validate input
            if (!loginData.username || !loginData.password) {
                res.status(400).json({ message: 'Missing required fields' });
                return;
            }

            // Authenticate user
            const { user, token } = await authService.loginUser(loginData);

            // Return user info and token
            res.status(200).json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            });
        } catch (error: any) {
            res.status(401).json({ message: error.message || 'Authentication failed' });
        }
    }

    /**
     * Generate API key for authenticated user
     */
    async generateApiKey(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Generate new API key
            const apiKey = await authService.generateApiKey(userId);

            res.status(201).json({
                message: 'API key generated successfully',
                apiKey: {
                    id: apiKey.id,
                    key: apiKey.key,
                    createdAt: apiKey.createdAt
                }
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to generate API key' });
        }
    }

    /**
     * Get user's API keys
     */
    async getApiKeys(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Get user's API keys
            const apiKeys = await authService.getUserApiKeys(userId);

            res.status(200).json({
                message: 'API keys retrieved successfully',
                apiKeys: apiKeys.map(key => ({
                    id: key.id,
                    key: key.key,
                    lastUsed: key.lastUsed,
                    createdAt: key.createdAt
                }))
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to retrieve API keys' });
        }
    }

    /**
     * Revoke an API key
     */
    async revokeApiKey(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const apiKeyId = req.params.id;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!apiKeyId) {
                res.status(400).json({ message: 'API key ID is required' });
                return;
            }

            // Revoke API key
            await authService.revokeApiKey(apiKeyId, userId);

            res.status(200).json({
                message: 'API key revoked successfully'
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to revoke API key' });
        }
    }
}

export default new AuthController();