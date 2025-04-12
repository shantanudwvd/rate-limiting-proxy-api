import '../../../__tests__/setup';
import authService from '../../../services/auth.service';
import { User, ApiKey } from '../../../models';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            // Mock User.findOne to return null (user doesn't exist)
            const findOneMock = jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

            // Mock User.create to return a new user
            const createMock = jest.spyOn(User, 'create').mockResolvedValueOnce({
                id: 'new-user-id',
                username: 'newuser',
                email: 'new@example.com',
                password: 'hashedpassword',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                validatePassword: jest.fn().mockResolvedValue(true)
            } as any);

            const userData = {
                username: 'newuser',
                email: 'new@example.com',
                password: 'password123'
            };

            const result = await authService.registerUser(userData);

            expect(findOneMock).toHaveBeenCalledWith({
                where: { email: 'new@example.com' }
            });
            expect(createMock).toHaveBeenCalledWith({
                username: 'newuser',
                email: 'new@example.com',
                password: 'password123',
                isActive: true
            });
            expect(result).toEqual(expect.objectContaining({
                id: 'new-user-id',
                username: 'newuser',
                email: 'new@example.com'
            }));
        });

        it('should throw an error if user with email already exists', async () => {
            // Mock User.findOne to return an existing user
            const existingUser = {
                id: 'existing-user-id',
                username: 'existinguser',
                email: 'existing@example.com'
            };
            jest.spyOn(User, 'findOne').mockResolvedValueOnce(existingUser as any);

            const userData = {
                username: 'newuser',
                email: 'existing@example.com',
                password: 'password123'
            };

            await expect(authService.registerUser(userData)).rejects.toThrow(
                'User with this email already exists'
            );
        });
    });

    describe('loginUser', () => {
        it('should login a user successfully', async () => {
            // Mock user with validatePassword method
            const mockUser = {
                id: 'user-id',
                username: 'testuser',
                email: 'test@example.com',
                validatePassword: jest.fn().mockResolvedValueOnce(true)
            };

            // Mock User.findOne to return the user
            jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);

            // Mock generateJwtToken
            const mockToken = 'mocked-jwt-token';
            jest.spyOn(authService, 'generateJwtToken').mockReturnValueOnce(mockToken);

            const loginData = {
                username: 'testuser',
                password: 'correctpassword'
            };

            const result = await authService.loginUser(loginData);

            expect(mockUser.validatePassword).toHaveBeenCalledWith('correctpassword');
            expect(authService.generateJwtToken).toHaveBeenCalledWith(mockUser);
            expect(result).toEqual({
                user: mockUser,
                token: mockToken
            });
        });

        it('should throw an error if user not found', async () => {
            jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);

            const loginData = {
                username: 'nonexistentuser',
                password: 'password123'
            };

            await expect(authService.loginUser(loginData)).rejects.toThrow('Invalid credentials');
        });

        it('should throw an error if password is invalid', async () => {
            // Mock user with validatePassword method that returns false
            const mockUser = {
                id: 'user-id',
                username: 'testuser',
                email: 'test@example.com',
                validatePassword: jest.fn().mockResolvedValueOnce(false)
            };

            jest.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser as any);

            const loginData = {
                username: 'testuser',
                password: 'wrongpassword'
            };

            await expect(authService.loginUser(loginData)).rejects.toThrow('Invalid credentials');
        });
    });

    describe('generateJwtToken', () => {
        it('should generate a valid JWT token', () => {
            // Mock jwt.sign
            const mockToken = 'mocked-jwt-token';
            (jwt.sign as jest.Mock).mockReturnValueOnce(mockToken);

            const user = {
                id: 'user-id',
                username: 'testuser',
                email: 'test@example.com'
            };

            const token = authService.generateJwtToken(user as any);

            expect(jwt.sign).toHaveBeenCalledWith(
                {
                    id: 'user-id',
                    username: 'testuser',
                    email: 'test@example.com'
                },
                expect.any(String),
                { expiresIn: expect.any(String) }
            );
            expect(token).toBe(mockToken);
        });
    });

    describe('generateApiKey', () => {
        it('should generate an API key for a user', async () => {
            const mockApiKey = {
                id: 'api-key-id',
                key: 'rlp_testkey123456',
                userId: 'user-id',
                isActive: true,
                lastUsed: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            jest.spyOn(ApiKey, 'create').mockResolvedValueOnce(mockApiKey as any);

            const result = await authService.generateApiKey('user-id');

            expect(ApiKey.create).toHaveBeenCalledWith({
                userId: 'user-id'
            });
            expect(result).toEqual(mockApiKey);
        });
    });
});