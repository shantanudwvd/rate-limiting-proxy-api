import axios, { AxiosRequestConfig, Method } from 'axios';
import { App } from '../models';
import { Request, Response } from 'express';
import logger from '../utils/logger';

class ProxyService {
    /**
     * Forward a request to the target API
     */
    async forwardRequest(
        req: Request,
        res: Response,
        app: App
    ): Promise<void> {
        try {
            logger.info(`Forwarding request to ${app.baseUrl}`);

            // Extract path from original URL (remove the /apis/<appId> part)
            const originalPath = req.originalUrl;
            const appIdPattern = new RegExp(`^/apis/${app.id}/`);
            const path = originalPath.replace(appIdPattern, '');

            // Construct target URL
            const targetUrl = `${app.baseUrl}${path}`;
            logger.info(`Target URL: ${targetUrl}`);

            // Prepare headers
            const headers: Record<string, string> = { ...req.headers } as Record<string, string>;

            // Remove headers that shouldn't be forwarded
            delete headers.host;
            delete headers['x-api-key'];
            delete headers['content-length'];

            // Clone authorization header if present (often needed for third-party APIs)
            if (req.headers.authorization) {
                headers.authorization = req.headers.authorization as string;
            }

            // Prepare request config
            const config: AxiosRequestConfig = {
                method: req.method as Method,
                url: targetUrl,
                headers,
                data: req.body,
                params: req.query,
                responseType: 'arraybuffer', // Use arraybuffer to handle any response type
                validateStatus: () => true, // Don't throw on non-2xx status codes
                timeout: 30000, // 30 second timeout
            };

            logger.info(`Sending ${req.method} request to ${targetUrl}`);

            // Make the request to the target API
            const response = await axios(config);

            logger.info(`Received response from ${targetUrl} with status ${response.status}`);

            // Set response headers
            Object.entries(response.headers).forEach(([key, value]) => {
                // Skip setting content-length as it will be set automatically
                if (key.toLowerCase() !== 'content-length') {
                    res.setHeader(key, value);
                }
            });

            // Add proxy info headers
            res.setHeader('X-Proxy-Timestamp', new Date().toISOString());
            res.setHeader('X-Proxied-By', 'Rate Limiting Proxy API');

            // Set status code
            res.status(response.status);

            // Send response data
            const responseData = response.data;
            res.send(responseData);

            logger.info(`Response sent back to client with status ${response.status}`);
        } catch (error: any) {
            logger.error(`Error forwarding request: ${error.message}`);

            // Handle network errors
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                logger.error(`Target API returned error status: ${error.response.status}`);

                // Try to get response data in a readable format
                let errorData = error.response.data;
                if (Buffer.isBuffer(errorData)) {
                    try {
                        errorData = errorData.toString('utf8');
                        // Try to parse as JSON if possible
                        try {
                            errorData = JSON.parse(errorData);
                        } catch (e) {
                            // Not JSON, keep as string
                        }
                    } catch (e) {
                        errorData = 'Binary response data';
                    }
                }

                res.status(error.response.status).json({
                    message: 'Error from target API',
                    error: errorData,
                });
            } else if (error.request) {
                // The request was made but no response was received
                logger.error('No response received from target API');
                res.status(502).json({
                    message: 'No response from target API',
                    error: 'Gateway timeout',
                });
            } else {
                // Something happened in setting up the request that triggered an Error
                logger.error(`Request setup error: ${error.message}`);
                res.status(500).json({
                    message: 'Error forwarding request',
                    error: error.message,
                });
            }
        }
    }
}

export default new ProxyService();