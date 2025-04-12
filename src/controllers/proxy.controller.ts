import { Request, Response } from 'express';
import appService from '../services/app.service';
import proxyService from '../services/proxy.service';
import { AuthRequest } from '../types';

class ProxyController {
    /**
     * Handle proxying of requests to target APIs
     */
    async proxyRequest(req: AuthRequest, res: Response): Promise<void> {
        try {
            const appId = req.params.appId;

            if (!appId) {
                res.status(400).json({ message: 'App ID is required' });
                return;
            }

            // Get app from request (set by rate limit middleware)
            // Or fetch it if not already in the request
            let app = (req as any).proxyApp;

            if (!app) {
                app = await appService.findAppForProxy(appId);

                if (!app) {
                    res.status(404).json({ message: 'App not found' });
                    return;
                }
            }

            // Forward the request to the target API
            await proxyService.forwardRequest(req, res, app);
        } catch (error: any) {
            // If response has already been sent, we can't send error
            if (!res.headersSent) {
                res.status(500).json({ message: error.message || 'Proxy request failed' });
            }
        }
    }
}

export default new ProxyController();