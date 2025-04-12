import { User, ApiKey } from '../models';
import jwt from 'jsonwebtoken';
import { APP_CONFIG } from '../config/app';
import { RegisterUserRequest, LoginRequest } from '../types';
import { generateApiKey } from '../utils/crypto';

class AuthService {
    /**
     * Register a new user
     */
    async registerUser(userData: RegisterUserRequest): Promise<User> {
        try {
            // Check if user with email already exists
            const existingUser = await User.findOne({
                where: {
                    email: userData.email
                }
            });

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Create new user
            const user = await User.create({
                username: userData.username,
                email: userData.email,
                password: userData.password,
                isActive: true
            });

            return user;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Login a user
     */
    async loginUser(loginData: LoginRequest): Promise<{ user: User; token: string }> {
        try {
            // Find user by username
            const user = await User.findOne({
                where: {
                    username: loginData.username
                }
            });

            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Validate password
            const isPasswordValid = await user.validatePassword(loginData.password);
            if (!isPasswordValid) {
                throw new Error('Invalid credentials');
            }

            // Generate JWT token
            const token = this.generateJwtToken(user);

            return { user, token };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Generate JWT token for a user
     */
    generateJwtToken(user: User): string {
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        return jwt.sign(payload, APP_CONFIG.jwtSecret, {
            expiresIn: APP_CONFIG.jwtExpiresIn
        });
    }

    /**
     * Verify JWT token
     */
    verifyJwtToken(token: string): any {
        try {
            return jwt.verify(token, APP_CONFIG.jwtSecret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    /**
     * Generate API key for a user
     */
    async generateApiKey(userId: string): Promise<ApiKey> {
        try {
            // Explicitly generate a key using your utility function
            const keyValue = generateApiKey(); // Using your utility function from crypto.ts

            return await ApiKey.create({
                userId: userId,
                isActive: true,
                key: keyValue // Explicitly set the key value
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user's API keys
     */
    async getUserApiKeys(userId: string): Promise<ApiKey[]> {
        try {
            const apiKeys = await ApiKey.findAll({
                where: {
                    userId: userId,
                    isActive: true
                }
            });

            return apiKeys;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Validate API key
     */
    async validateApiKey(apiKey: string): Promise<User | null> {
        try {
            // Find API key in database
            const apiKeyRecord = await ApiKey.findOne({
                where: {
                    key: apiKey,
                    isActive: true
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'email', 'isActive']
                    }
                ]
            });

            // Check if API key exists and has a valid user
            if (!apiKeyRecord) {
                return null;
            }

            // Get user from API key record
            // Since TypeScript can't know for sure that apiKeyRecord.user exists
            // We need to use type assertion or handle it differently
            const user = (apiKeyRecord as any).user;

            if (!user || !user.isActive) {
                return null;
            }

            // Update last used timestamp
            await apiKeyRecord.update({
                lastUsed: new Date()
            });

            return user;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Revoke an API key
     */
    async revokeApiKey(apiKeyId: string, userId: string): Promise<boolean> {
        try {
            const apiKey = await ApiKey.findOne({
                where: {
                    id: apiKeyId,
                    userId: userId
                }
            });

            if (!apiKey) {
                throw new Error('API key not found');
            }

            await apiKey.update({
                isActive: false
            });

            return true;
        } catch (error) {
            throw error;
        }
    }
}

export default new AuthService();