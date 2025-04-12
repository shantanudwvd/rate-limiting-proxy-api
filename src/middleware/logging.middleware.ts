import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Generate a unique request ID
const generateRequestId = (): string => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

// Log incoming requests
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    // Generate unique ID for this request
    const requestId = generateRequestId();
    res.locals.requestId = requestId;

    // Get request details
    const { method, originalUrl, ip } = req;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Log request
    logger.http(
        `[${requestId}] ${method} ${originalUrl} - IP: ${ip} - User-Agent: ${userAgent}`
    );

    // Set start time
    const startTime = Date.now();

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { statusCode } = res;

        // Determine log level based on status code
        if (statusCode >= 500) {
            logger.error(
                `[${requestId}] ${method} ${originalUrl} - ${statusCode} - ${duration}ms`
            );
        } else if (statusCode >= 400) {
            logger.warn(
                `[${requestId}] ${method} ${originalUrl} - ${statusCode} - ${duration}ms`
            );
        } else {
            logger.info(
                `[${requestId}] ${method} ${originalUrl} - ${statusCode} - ${duration}ms`
            );
        }
    });

    next();
};

// Log errors
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = res.locals.requestId || 'unknown';

    logger.error(
        `[${requestId}] Error: ${err.message}\nStack: ${err.stack}`
    );

    next(err);
};