import { Response } from 'express';
import appService from '../services/app.service';
import { AuthRequest, RegisterAppRequest } from '../types';

class AppController {
    /**
     * Register a new app
     */
    async registerApp(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const appData: RegisterAppRequest = req.body;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Register app
            const app = await appService.registerApp(appData, userId);

            res.status(201).json({
                message: 'App registered successfully',
                app: {
                    id: app.id,
                    name: app.name,
                    baseUrl: app.baseUrl,
                    rateLimitStrategy: app.rateLimitStrategy,
                    requestLimit: app.requestLimit,
                    timeWindowMs: app.timeWindowMs,
                    additionalConfig: app.additionalConfig,
                    createdAt: app.createdAt,
                },
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to register app' });
        }
    }

    /**
     * Get app by ID
     */
    async getAppById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const appId = req.params.id;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!appId) {
                res.status(400).json({ message: 'App ID is required' });
                return;
            }

            // Get app
            const app = await appService.getAppById(appId, userId);

            if (!app) {
                res.status(404).json({ message: 'App not found' });
                return;
            }

            // Create a response object with type assertion to include rateLimit
            const appWithRateLimit = {
                id: app.id,
                name: app.name,
                baseUrl: app.baseUrl,
                rateLimitStrategy: app.rateLimitStrategy,
                requestLimit: app.requestLimit,
                timeWindowMs: app.timeWindowMs,
                additionalConfig: app.additionalConfig,
                // Safely access rateLimit with type assertion
                rateLimit: (app as any).rateLimit,
                createdAt: app.createdAt,
                updatedAt: app.updatedAt,
            };

            res.status(200).json({
                message: 'App retrieved successfully',
                app: appWithRateLimit,
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to retrieve app' });
        }
    }

    /**
     * Get all apps for a user
     */
    async getUserApps(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Get user's apps
            const apps = await appService.getUserApps(userId);

            res.status(200).json({
                message: 'Apps retrieved successfully',
                apps: apps.map(app => ({
                    id: app.id,
                    name: app.name,
                    baseUrl: app.baseUrl,
                    rateLimitStrategy: app.rateLimitStrategy,
                    requestLimit: app.requestLimit,
                    timeWindowMs: app.timeWindowMs,
                    createdAt: app.createdAt,
                })),
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to retrieve apps' });
        }
    }

    /**
     * Update app configuration
     */
    async updateApp(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const appId = req.params.id;
            const updateData: Partial<RegisterAppRequest> = req.body;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!appId) {
                res.status(400).json({ message: 'App ID is required' });
                return;
            }

            // Update app
            const updatedApp = await appService.updateApp(appId, userId, updateData);

            if (!updatedApp) {
                res.status(404).json({ message: 'App not found' });
                return;
            }

            res.status(200).json({
                message: 'App updated successfully',
                app: {
                    id: updatedApp.id,
                    name: updatedApp.name,
                    baseUrl: updatedApp.baseUrl,
                    rateLimitStrategy: updatedApp.rateLimitStrategy,
                    requestLimit: updatedApp.requestLimit,
                    timeWindowMs: updatedApp.timeWindowMs,
                    additionalConfig: updatedApp.additionalConfig,
                    createdAt: updatedApp.createdAt,
                    updatedAt: updatedApp.updatedAt,
                },
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to update app' });
        }
    }

    /**
     * Delete an app
     */
    async deleteApp(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const appId = req.params.id;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!appId) {
                res.status(400).json({ message: 'App ID is required' });
                return;
            }

            // Delete app
            const success = await appService.deleteApp(appId, userId);

            if (!success) {
                res.status(404).json({ message: 'App not found' });
                return;
            }

            res.status(200).json({
                message: 'App deleted successfully',
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to delete app' });
        }
    }

    /**
     * Search apps by name or base URL
     */
    async searchApps(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            const query = req.query.q as string;

            if (!userId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            if (!query) {
                res.status(400).json({ message: 'Search query is required' });
                return;
            }

            // Search apps
            const apps = await appService.searchApps(userId, query);

            res.status(200).json({
                message: 'Search results',
                apps: apps.map(app => ({
                    id: app.id,
                    name: app.name,
                    baseUrl: app.baseUrl,
                    rateLimitStrategy: app.rateLimitStrategy,
                    requestLimit: app.requestLimit,
                    timeWindowMs: app.timeWindowMs,
                    createdAt: app.createdAt,
                })),
            });
        } catch (error: any) {
            res.status(400).json({ message: error.message || 'Failed to search apps' });
        }
    }
}

export default new AppController();