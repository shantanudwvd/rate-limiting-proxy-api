import '../../../__tests__/setup';
import rateLimitService from '../../../services/rateLimit.service';
import { App, RateLimit } from '../../../models';
import { RateLimitStrategy } from '../../../models/app.model';

describe('RateLimitService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkRateLimit', () => {
        it('should check token bucket rate limit and return not limited when under limit', async () => {
            // Create mock app
            const mockApp = {
                id: 'app-id',
                rateLimitStrategy: RateLimitStrategy.TOKEN_BUCKET,
                requestLimit: 100,
                timeWindowMs: 60000,
            };

            // Create mock rate limit record
            const mockRateLimit = {
                id: 'rate-limit-id',
                appId: 'app-id',
                currentCount: 10,
                windowStartTime: new Date(Date.now() - 10000), // 10 seconds ago
                lastRequest: new Date(Date.now() - 5000), // 5 seconds ago
                resetTime: new Date(Date.now() + 50000), // 50 seconds in future
                tokenBucket: 90, // 90 tokens remaining
                update: jest.fn().mockResolvedValue(true)
            };

            // Mock RateLimit.findOne
            jest.spyOn(RateLimit, 'findOne').mockResolvedValueOnce(mockRateLimit as any);

            // Call the service
            const result = await rateLimitService.checkRateLimit(mockApp as any);

            // Check results
            expect(result.isLimited).toBe(false);
            expect(result.remaining).toBeLessThanOrEqual(89); // Should be 89 or less after consuming a token
            expect(result.limit).toBe(100);
            expect(mockRateLimit.update).toHaveBeenCalled();
        });

        it('should check token bucket rate limit and return limited when at limit', async () => {
            // Create mock app
            const mockApp = {
                id: 'app-id',
                rateLimitStrategy: RateLimitStrategy.TOKEN_BUCKET,
                requestLimit: 100,
                timeWindowMs: 60000,
            };

            // Create mock rate limit record with no tokens left
            const mockRateLimit = {
                id: 'rate-limit-id',
                appId: 'app-id',
                currentCount: 100,
                windowStartTime: new Date(Date.now() - 10000),
                lastRequest: new Date(Date.now() - 100),
                resetTime: new Date(Date.now() + 50000),
                tokenBucket: 0.5, // Less than 1 token remaining
                update: jest.fn().mockResolvedValue(true)
            };

            // Mock RateLimit.findOne
            jest.spyOn(RateLimit, 'findOne').mockResolvedValueOnce(mockRateLimit as any);

            // Call the service
            const result = await rateLimitService.checkRateLimit(mockApp as any);

            // Check results
            expect(result.isLimited).toBe(true);
            expect(result.remaining).toBe(0);
            expect(result.limit).toBe(100);
            expect(mockRateLimit.update).toHaveBeenCalled();
        });

        it('should reset the rate limit window when expired', async () => {
            // Create mock app
            const mockApp = {
                id: 'app-id',
                rateLimitStrategy: RateLimitStrategy.TOKEN_BUCKET,
                requestLimit: 100,
                timeWindowMs: 60000,
            };

            // Create mock rate limit record with expired window
            const mockRateLimit = {
                id: 'rate-limit-id',
                appId: 'app-id',
                currentCount: 100,
                windowStartTime: new Date(Date.now() - 70000), // 70 seconds ago
                lastRequest: new Date(Date.now() - 5000),
                resetTime: new Date(Date.now() - 10000), // 10 seconds ago (expired)
                tokenBucket: 0,
                update: jest.fn().mockResolvedValue(true)
            };

            // Mock RateLimit.findOne
            jest.spyOn(RateLimit, 'findOne').mockResolvedValueOnce(mockRateLimit as any);

            // Call the service
            const result = await rateLimitService.checkRateLimit(mockApp as any);

            // Check results
            expect(result.isLimited).toBe(false);
            expect(result.remaining).toBe(99); // 100 - 1 (for current request)
            expect(result.limit).toBe(100);
            expect(mockRateLimit.update).toHaveBeenCalled();
        });
    });
});