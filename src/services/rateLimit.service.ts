import { App, RateLimit } from '../models';
import { RateLimitStrategy } from '../models/app.model';
import { RateLimitStatus } from '../types';
import queueService from './queue.service';

class RateLimitService {
    /**
     * Check if a request for an app will be rate limited
     */
    async checkRateLimit(app: App): Promise<RateLimitStatus> {
        try {
            // Get rate limit record
            const rateLimitRecord = await RateLimit.findOne({
                where: {
                    appId: app.id,
                },
            });

            if (!rateLimitRecord) {
                throw new Error('Rate limit record not found');
            }

            // Current time
            const now = new Date();

            // Check if rate limit window has expired
            if (now > rateLimitRecord.resetTime) {
                // Reset window
                await this.resetRateLimitWindow(app, rateLimitRecord);

                // Return fresh rate limit status
                return {
                    limit: app.requestLimit,
                    remaining: app.requestLimit - 1, // Counting current request
                    reset: Math.floor(new Date(now.getTime() + app.timeWindowMs).getTime() / 1000),
                    isLimited: false,
                };
            }

            // Apply rate limiting strategy
            switch (app.rateLimitStrategy) {
                case RateLimitStrategy.TOKEN_BUCKET:
                    return this.applyTokenBucketStrategy(app, rateLimitRecord, now);
                case RateLimitStrategy.FIXED_WINDOW:
                    return this.applyFixedWindowStrategy(app, rateLimitRecord, now);
                case RateLimitStrategy.SLIDING_WINDOW:
                    return this.applySlidingWindowStrategy(app, rateLimitRecord, now);
                case RateLimitStrategy.LEAKY_BUCKET:
                    return this.applyLeakyBucketStrategy(app, rateLimitRecord, now);
                default:
                    // Default to fixed window if strategy is not recognized
                    return this.applyFixedWindowStrategy(app, rateLimitRecord, now);
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * Apply token bucket rate limiting strategy
     */
    private async applyTokenBucketStrategy(
        app: App,
        rateLimitRecord: RateLimit,
        now: Date
    ): Promise<RateLimitStatus> {
        // Calculate time passed since last request in seconds
        const timePassedMs = now.getTime() - rateLimitRecord.lastRequest.getTime();

        // Calculate tokens added (rate = tokens per millisecond)
        const tokensToAdd = (timePassedMs / app.timeWindowMs) * app.requestLimit;

        // Add tokens but don't exceed bucket capacity
        let tokenBucket = Math.min(
            (rateLimitRecord.tokenBucket || 0) + tokensToAdd,
            app.requestLimit
        );

        // Check if enough tokens available for this request
        const isLimited = tokenBucket < 1;

        if (!isLimited) {
            // Consume a token for this request
            tokenBucket -= 1;
        }

        // Update rate limit record
        await rateLimitRecord.update({
            lastRequest: now,
            tokenBucket,
        });

        return {
            limit: app.requestLimit,
            remaining: Math.floor(tokenBucket),
            reset: Math.floor(rateLimitRecord.resetTime.getTime() / 1000),
            isLimited,
        };
    }

    /**
     * Apply fixed window rate limiting strategy
     */
    private async applyFixedWindowStrategy(
        app: App,
        rateLimitRecord: RateLimit,
        now: Date
    ): Promise<RateLimitStatus> {
        // Check if current request count is below limit
        const isLimited = rateLimitRecord.currentCount >= app.requestLimit;

        // If not limited, increment count
        if (!isLimited) {
            await rateLimitRecord.update({
                currentCount: rateLimitRecord.currentCount + 1,
                lastRequest: now,
            });
        }

        return {
            limit: app.requestLimit,
            remaining: app.requestLimit - rateLimitRecord.currentCount - (isLimited ? 0 : 1),
            reset: Math.floor(rateLimitRecord.resetTime.getTime() / 1000),
            isLimited,
        };
    }

    /**
     * Apply sliding window rate limiting strategy
     */
    private async applySlidingWindowStrategy(
        app: App,
        rateLimitRecord: RateLimit,
        now: Date
    ): Promise<RateLimitStatus> {
        // Calculate how far we are into the current window (0-1)
        const timePassedMs = now.getTime() - rateLimitRecord.windowStartTime.getTime();
        const windowProgress = Math.min(timePassedMs / app.timeWindowMs, 1);

        // Calculate weight of previous window's count (reduces as we progress in current window)
        const prevWindowWeight = 1 - windowProgress;

        // Current request count is combination of:
        // 1. Previous window's count weighted by how recently window started
        // 2. Current count in this window
        const effectiveCount = Math.ceil(
            (rateLimitRecord.currentCount * prevWindowWeight) +
            (rateLimitRecord.currentCount)
        );

        // Check if current effective count is below limit
        const isLimited = effectiveCount >= app.requestLimit;

        // If not limited, increment count
        if (!isLimited) {
            await rateLimitRecord.update({
                currentCount: rateLimitRecord.currentCount + 1,
                lastRequest: now,
            });
        }

        // Calculate remaining requests based on effective count
        const remaining = Math.max(0, app.requestLimit - effectiveCount - (isLimited ? 0 : 1));

        return {
            limit: app.requestLimit,
            remaining,
            reset: Math.floor(rateLimitRecord.resetTime.getTime() / 1000),
            isLimited,
        };
    }

    /**
     * Apply leaky bucket rate limiting strategy
     */
    private async applyLeakyBucketStrategy(
        app: App,
        rateLimitRecord: RateLimit,
        now: Date
    ): Promise<RateLimitStatus> {
        // Calculate time passed since last request
        const timePassedMs = now.getTime() - rateLimitRecord.lastRequest.getTime();

        // Calculate "leakage" (how many requests have been "processed" since last check)
        // We use the rate: requests / timeWindow
        const leakedRequests = (timePassedMs / app.timeWindowMs) * app.requestLimit;

        // Calculate current bucket level (decreasing it by leakage)
        let currentLevel = Math.max(0, rateLimitRecord.currentCount - leakedRequests);

        // Check if bucket is full
        const isLimited = currentLevel >= app.requestLimit;

        // If not limited, add this request to the bucket
        if (!isLimited) {
            currentLevel += 1;
        }

        // Update rate limit record
        await rateLimitRecord.update({
            currentCount: currentLevel,
            lastRequest: now,
        });

        // Calculate time until next request could be processed
        const timeToNextRequest = isLimited ?
            ((currentLevel - app.requestLimit + 1) / app.requestLimit) * app.timeWindowMs : 0;

        const resetTime = new Date(now.getTime() + timeToNextRequest);

        return {
            limit: app.requestLimit,
            remaining: Math.floor(app.requestLimit - currentLevel),
            reset: Math.floor(resetTime.getTime() / 1000),
            isLimited,
        };
    }

    /**
     * Reset rate limit window for an app
     */
    private async resetRateLimitWindow(
        app: App,
        rateLimitRecord: RateLimit
    ): Promise<void> {
        const now = new Date();
        const resetTime = new Date(now.getTime() + app.timeWindowMs);

        // Reset rate limit tracking based on strategy
        let updateData: Partial<RateLimit> = {
            windowStartTime: now,
            lastRequest: now,
            resetTime,
            currentCount: 1, // Count the current request
        };

        // For token bucket, reset tokens
        if (app.rateLimitStrategy === RateLimitStrategy.TOKEN_BUCKET) {
            updateData.tokenBucket = app.requestLimit - 1; // Full bucket minus current request
        }

        await rateLimitRecord.update(updateData);

        // Process any queued requests for this app
        queueService.processQueue(app.id);
    }

    /**
     * Increment request count for an app
     */
    async incrementRequestCount(appId: string): Promise<void> {
        try {
            const rateLimitRecord = await RateLimit.findOne({
                where: {
                    appId,
                },
            });

            if (rateLimitRecord) {
                await rateLimitRecord.update({
                    currentCount: rateLimitRecord.currentCount + 1,
                    lastRequest: new Date(),
                });
            }
        } catch (error) {
            throw error;
        }
    }
}

export default new RateLimitService();