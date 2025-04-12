import express from 'express';
import proxyController from '../controllers/proxy.controller';
import { authenticateApiKey } from '../middleware/auth.middleware';
import { applyRateLimit } from '../middleware/rateLimit.middleware';

const router = express.Router();

// All routes require API key authentication
router.use(authenticateApiKey);

// Apply rate limiting to all proxy requests
router.all('/:appId/*', applyRateLimit, proxyController.proxyRequest);

// Fallback for incorrect routes
router.all('*', (req, res) => {
    res.status(400).json({ message: 'Invalid proxy URL format. Use /apis/:appId/path' });
});

export default router;