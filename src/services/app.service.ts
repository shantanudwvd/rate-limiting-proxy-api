import { App, RateLimit } from '../models';
import { RegisterAppRequest } from '../types';
import { RateLimitStrategy } from '../models/app.model';
import { Op } from 'sequelize';

class AppService {
    /**
     * Register a new app
     */
    async registerApp(appData: RegisterAppRequest, userId: string): Promise<App> {
        try {
            // Ensure baseUrl ends with a slash
            if (!appData.baseUrl.endsWith('/')) {
                appData.baseUrl = `${appData.baseUrl}/`;
            }

            // Create new app
            const app = await App.create({
                name: appData.name,
                userId,
                baseUrl: appData.baseUrl,
                rateLimitStrategy: appData.rateLimitStrategy,
                requestLimit: appData.requestLimit,
                timeWindowMs: appData.timeWindowMs,
                additionalConfig: appData.additionalConfig || {},
                isActive: true
            });

            // Calculate initial reset time
            const resetTime = new Date(Date.now() + appData.timeWindowMs);

            // Initialize rate limit tracking for this app
            await RateLimit.create({
                appId: app.id,
                currentCount: 0,
                windowStartTime: new Date(),
                lastRequest: new Date(),
                resetTime,
                tokenBucket:
                    appData.rateLimitStrategy === RateLimitStrategy.TOKEN_BUCKET
                        ? appData.requestLimit
                        : undefined,
            });

            return app;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get app by ID
     */
    async getAppById(appId: string, userId: string): Promise<App | null> {
        try {
            const app = await App.findOne({
                where: {
                    id: appId,
                    userId,
                    isActive: true,
                },
                include: [
                    {
                        model: RateLimit,
                        as: 'rateLimit',
                    },
                ],
            });

            return app;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all apps for a user
     */
    async getUserApps(userId: string): Promise<App[]> {
        try {
            const apps = await App.findAll({
                where: {
                    userId,
                    isActive: true,
                },
                include: [
                    {
                        model: RateLimit,
                        as: 'rateLimit',
                    },
                ],
            });

            return apps;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update app configuration
     */
    async updateApp(
        appId: string,
        userId: string,
        updateData: Partial<RegisterAppRequest>
    ): Promise<App | null> {
        try {
            // Find app
            const app = await App.findOne({
                where: {
                    id: appId,
                    userId,
                    isActive: true,
                },
            });

            if (!app) {
                return null;
            }

            // Prepare update data
            const updateObj: any = {};

            if (updateData.name) {
                updateObj.name = updateData.name;
            }

            if (updateData.baseUrl) {
                // Ensure baseUrl ends with a slash
                let baseUrl = updateData.baseUrl;
                if (!baseUrl.endsWith('/')) {
                    baseUrl = `${baseUrl}/`;
                }
                updateObj.baseUrl = baseUrl;
            }

            if (updateData.rateLimitStrategy) {
                updateObj.rateLimitStrategy = updateData.rateLimitStrategy;
            }

            if (updateData.requestLimit) {
                updateObj.requestLimit = updateData.requestLimit;
            }

            if (updateData.timeWindowMs) {
                updateObj.timeWindowMs = updateData.timeWindowMs;
            }

            if (updateData.additionalConfig) {
                updateObj.additionalConfig = updateData.additionalConfig;
            }

            // Update app
            await app.update(updateObj);

            // If rate limit parameters changed, update rate limit tracking
            if (
                updateData.rateLimitStrategy ||
                updateData.requestLimit ||
                updateData.timeWindowMs
            ) {
                // Get rate limit record
                const rateLimit = await RateLimit.findOne({
                    where: {
                        appId: app.id,
                    },
                });

                if (rateLimit) {
                    // Calculate new reset time
                    const resetTime = new Date(Date.now() + app.timeWindowMs);

                    // Update rate limit tracking
                    await rateLimit.update({
                        resetTime,
                        tokenBucket:
                            app.rateLimitStrategy === RateLimitStrategy.TOKEN_BUCKET
                                ? app.requestLimit
                                : undefined,
                    });
                }
            }

            // Refresh app data
            return await this.getAppById(appId, userId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete an app (mark as inactive)
     */
    async deleteApp(appId: string, userId: string): Promise<boolean> {
        try {
            const app = await App.findOne({
                where: {
                    id: appId,
                    userId,
                    isActive: true,
                },
            });

            if (!app) {
                return false;
            }

            // Mark as inactive (soft delete)
            await app.update({
                isActive: false,
            });

            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Find app by ID for proxy purposes
     * This doesn't check userId for authorization since it's used by the proxy
     */
    async findAppForProxy(appId: string): Promise<App | null> {
        try {
            const app = await App.findOne({
                where: {
                    id: appId,
                    isActive: true,
                },
                include: [
                    {
                        model: RateLimit,
                        as: 'rateLimit',
                    },
                ],
            });

            return app;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Search apps by name or base URL
     */
    async searchApps(
        userId: string,
        query: string
    ): Promise<App[]> {
        try {
            const apps = await App.findAll({
                where: {
                    userId,
                    isActive: true,
                    [Op.or]: [
                        {
                            name: {
                                [Op.iLike]: `%${query}%`,
                            },
                        },
                        {
                            baseUrl: {
                                [Op.iLike]: `%${query}%`,
                            },
                        },
                    ],
                },
            });

            return apps;
        } catch (error) {
            throw error;
        }
    }
}

export default new AppService();