import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import appService from '../services/app.service';
import rateLimitService from '../services/rateLimit.service';
import queueService from '../services/queue.service';
import logger from '../utils/logger';

/**
 * Middleware to apply rate limiting to proxied requests
 */
export const applyRateLimit = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const appId = req.params.appId;

        if (!appId) {
            res.status(400).json({ message: 'App ID is required' });
            return;
        }

        // Find app for proxying
        const app = await appService.findAppForProxy(appId);

        if (!app) {
            res.status(404).json({ message: 'App not found' });
            return;
        }

        // Check rate limit
        const rateLimitStatus = await rateLimitService.checkRateLimit(app);
        logger.info(`Rate limit status for app ${appId}: ${JSON.stringify(rateLimitStatus)}`);

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', rateLimitStatus.limit.toString());
        res.setHeader('X-RateLimit-Remaining', rateLimitStatus.remaining.toString());
        res.setHeader('X-RateLimit-Reset', rateLimitStatus.reset.toString());

        // Store app in request for later use in proxy
        (req as any).proxyApp = app;

        // If rate limited, queue the request instead of processing immediately
        if (rateLimitStatus.isLimited) {
            res.setHeader('X-RateLimit-Retry-After', rateLimitStatus.reset.toString());

            try {
                // Try to enqueue the request
                const queueResult = await queueService.enqueueRequest(req, res);

                // If request was queued, don't proceed with the middleware chain
                // Instead, the queue service will handle the response when the request is processed
                if (queueResult.queued) {
                    logger.info(`Request queued for app ${appId}. Will be processed when rate limit resets.`);

                    // Don't call next() here - we'll handle the response directly from the queue
                    // This request will be resumed from the queue later
                    return;
                }

                // If queue is full or any other error, fall back to 429 response
                res.status(429).json({
                    message: queueResult.message || 'Too Many Requests',
                    retryAfter: rateLimitStatus.reset - Math.floor(Date.now() / 1000)
                });
                return;
            } catch (error) {
                // If queueing fails, return rate limit error
                logger.error(`Error queueing request: ${error}`);
                res.status(429).json({
                    message: 'Too Many Requests',
                    retryAfter: rateLimitStatus.reset - Math.floor(Date.now() / 1000)
                });
                return;
            }
        }

        // If not rate limited, proceed with the request
        next();
    } catch (error: any) {
        logger.error(`Error applying rate limit: ${error.message}`);
        res.status(500).json({ message: error.message || 'Error applying rate limit' });
    }
};