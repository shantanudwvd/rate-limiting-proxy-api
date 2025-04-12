import express from 'express';
import authController from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import {
    registerValidation,
    loginValidation,
    apiKeyIdValidation
} from '../utils/validator';

const router = express.Router();

// User registration with validation
router.post('/register', registerValidation, authController.register);

// User login with validation
router.post('/login', loginValidation, authController.login);

// API key management (requires JWT authentication)
router.post('/api-key', authenticateJwt, authController.generateApiKey);
router.get('/api-keys', authenticateJwt, authController.getApiKeys);
router.delete('/api-key/:id', authenticateJwt, apiKeyIdValidation, authController.revokeApiKey);

export default router;