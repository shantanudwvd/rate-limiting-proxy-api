import axios, { AxiosRequestConfig, Method } from 'axios';
import { App } from '../models';
import { Request, Response } from 'express';

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
            // Extract path from original URL (remove the /apis/<appId> part)
            const originalPath = req.originalUrl;
            const appIdPattern = new RegExp(`^/apis/${app.id}/`);
            const path = originalPath.replace(appIdPattern, '');

            // Construct target URL
            const targetUrl = `${app.baseUrl}${path}`;

            // Prepare headers
            const headers: Record<string, string> = { ...req.headers } as Record<string, string>;

            // Remove headers that shouldn't be forwarded
            delete headers.host;
            delete headers['x-api-key'];

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
            };

            // Make the request to the target API
            const response = await axios(config);

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
        } catch (error: any) {
            // Handle network errors
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                res.status(error.response.status).json({
                    message: 'Error from target API',
                    error: error.response.data,
                });
            } else if (error.request) {
                // The request was made but no response was received
                res.status(502).json({
                    message: 'No response from target API',
                    error: 'Gateway timeout',
                });
            } else {
                // Something happened in setting up the request that triggered an Error
                res.status(500).json({
                    message: 'Error forwarding request',
                    error: error.message,
                });
            }
        }
    }
}

export default new ProxyService();