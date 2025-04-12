import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { QueuedRequest } from '../types';
import { APP_CONFIG } from '../config/app';
import logger from '../utils/logger';
import appService from "./app.service";
import rateLimitService from "./rateLimit.service";
import proxyService from "./proxy.service";

class QueueService {
    private queues: Map<string, QueuedRequest[]> = new Map();
    private processing: Map<string, boolean> = new Map();
    private queueTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private resetTimers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Enqueue a rate-limited request for later processing
     */
    async enqueueRequest(req: Request, res: Response): Promise<{ queued: boolean; message?: string }> {
        try {
            const appId = req.params.appId;

            if (!appId) {
                return { queued: false, message: 'App ID is required' };
            }

            // Create queue for this app if it doesn't exist
            if (!this.queues.has(appId)) {
                this.queues.set(appId, []);
                this.processing.set(appId, false);
            }

            // Get the queue for this app
            const queue = this.queues.get(appId)!;

            // Check if queue is full
            if (queue.length >= APP_CONFIG.maxQueueSize) {
                return { queued: false, message: 'Queue is full, try again later' };
            }

            // Get reset time from headers
            const resetTime = res.getHeader('X-RateLimit-Reset') as string;
            const resetTimestamp = resetTime ? parseInt(resetTime) * 1000 : 0;

            // Set up a timer to process the queue when the rate limit resets
            if (resetTimestamp && resetTimestamp > Date.now()) {
                const timeUntilReset = resetTimestamp - Date.now() + 100; // Add 100ms buffer

                // Clear any existing timer for this app
                if (this.resetTimers.has(appId)) {
                    clearTimeout(this.resetTimers.get(appId)!);
                }

                // Set a new timer to process the queue when rate limit resets
                const timer = setTimeout(() => {
                    logger.info(`Rate limit reset timer triggered for app ${appId}`);
                    this.processQueue(appId);
                }, timeUntilReset);

                this.resetTimers.set(appId, timer);
                logger.info(`Queue will be processed in ${timeUntilReset}ms for app ${appId}`);
            }

            // Clone the relevant request data
            const queuedRequest: QueuedRequest = {
                id: uuidv4(),
                appId,
                method: req.method,
                url: req.originalUrl,
                headers: { ...req.headers },
                body: req.body,
                timestamp: Date.now(),
                req: req,     // Store the original request
                res: res,     // Store the original response
                resolve: (value: any) => {}, // Will be replaced in Promise constructor
                reject: (reason: any) => {}  // Will be replaced in Promise constructor
            };

            // Create a promise that will be resolved when the request is processed
            const requestPromise = new Promise<void>((resolve, reject) => {
                queuedRequest.resolve = resolve;
                queuedRequest.reject = reject;
            });

            // Add request to queue
            queue.push(queuedRequest);
            logger.info(`Request queued for app ${appId}. Queue length: ${queue.length}`);

            // Set timeout for this request
            const timeout = setTimeout(() => {
                this.removeRequestFromQueue(appId, queuedRequest.id);
                queuedRequest.reject(new Error('Request timed out while waiting in queue'));
                logger.warn(`Request ${queuedRequest.id} timed out in queue for app ${appId}`);
            }, APP_CONFIG.queueTimeout);

            // Store the timeout reference
            this.queueTimeouts.set(queuedRequest.id, timeout);

            // Start processing queue if not already processing
            if (!this.processing.get(appId)) {
                this.processQueue(appId);
            }

            // Handle the promise resolution/rejection
            requestPromise
                .then(() => {
                    // This will be handled by the proxy when the request is processed
                    logger.info(`Queued request ${queuedRequest.id} for app ${appId} has been processed`);
                })
                .catch((error) => {
                    // If the request times out or is otherwise rejected
                    logger.error(`Queued request ${queuedRequest.id} for app ${appId} failed: ${error.message}`);
                    if (!res.headersSent) {
                        res.status(408).json({ message: error.message || 'Request timed out in queue' });
                    }
                });

            return { queued: true };
        } catch (error) {
            logger.error(`Failed to queue request: ${error}`);
            return { queued: false, message: 'Failed to queue request' };
        }
    }

    /**
     * Process queued requests for an app
     */
    async processQueue(appId: string): Promise<void> {
        // If already processing, don't start a new processing cycle
        if (this.processing.get(appId)) {
            logger.info(`Queue for app ${appId} is already being processed`);
            return;
        }

        // Mark queue as processing
        this.processing.set(appId, true);
        logger.info(`Starting to process queue for app ${appId}`);

        // Get the queue
        const queue = this.queues.get(appId);

        if (!queue || queue.length === 0) {
            // No more requests to process
            this.processing.set(appId, false);
            logger.info(`No requests in queue for app ${appId}`);
            return;
        }

        try {
            // Get the oldest request
            const queuedRequest = queue[0];

            // *** KEY FIX HERE - Check if we're still rate limited ***
            const app = await appService.findAppForProxy(appId);
            if (!app) {
                logger.error(`App ${appId} not found for queued request`);
                this.processing.set(appId, false);
                return;
            }

            const rateLimitStatus = await rateLimitService.checkRateLimit(app);

            // If still rate limited, don't process yet - wait for the reset
            if (rateLimitStatus.isLimited) {
                logger.info(`Still rate limited for app ${appId}, waiting for reset`);
                this.processing.set(appId, false);
                return;
            }

            logger.info(`Processing queued request ${queuedRequest.id} for app ${appId}`);

            // Remove request from queue
            queue.shift();

            // Clear timeout
            if (this.queueTimeouts.has(queuedRequest.id)) {
                clearTimeout(this.queueTimeouts.get(queuedRequest.id)!);
                this.queueTimeouts.delete(queuedRequest.id);
            }

            // *** KEY ADDITION - Recreate the request and forward it to the target API ***
            try {
                // We need to recreate/simulate the original request
                // This is simplified - in a real implementation, you'd need to recreate the request
                // with all the original properties
                const req = queuedRequest.req; // You'll need to store the original request object
                const res = queuedRequest.res; // And the original response object

                if (req && res) {
                    // Forward the request to the proxy
                    await proxyService.forwardRequest(req, res, app);
                    logger.info(`Successfully forwarded queued request ${queuedRequest.id}`);
                }

                // After forwarding (or if we can't), resolve the promise
                if (typeof queuedRequest.resolve === 'function') {
                    queuedRequest.resolve({});
                    logger.info(`Resolved queued request ${queuedRequest.id}`);
                }
            } catch (error) {
                logger.error(`Error processing queued request: ${error}`);
                if (typeof queuedRequest.reject === 'function') {
                    queuedRequest.reject(error);
                }
            }

            // Wait a short time before processing next request
            setTimeout(() => {
                this.processing.set(appId, false);
                this.processQueue(appId);
            }, 100);
        } catch (error) {
            logger.error(`Error processing queue for app ${appId}: ${error}`);
            this.processing.set(appId, false);
        }
    }

    /**
     * Remove a request from the queue (e.g., when it times out)
     */
    private removeRequestFromQueue(appId: string, requestId: string): void {
        const queue = this.queues.get(appId);

        if (queue) {
            const index = queue.findIndex((req) => req.id === requestId);
            if (index !== -1) {
                queue.splice(index, 1);
                logger.info(`Removed request ${requestId} from queue for app ${appId}`);
            }
        }

        // Clear timeout
        if (this.queueTimeouts.has(requestId)) {
            clearTimeout(this.queueTimeouts.get(requestId)!);
            this.queueTimeouts.delete(requestId);
        }
    }

    /**
     * Get queue status for an app
     */
    getQueueStatus(appId: string): { queueLength: number; processing: boolean } {
        return {
            queueLength: this.queues.get(appId)?.length || 0,
            processing: this.processing.get(appId) || false,
        };
    }

    /**
     * Force process all queues (can be called when rate limits reset)
     */
    processAllQueues(): void {
        for (const appId of this.queues.keys()) {
            if (this.queues.get(appId)?.length) {
                logger.info(`Force processing queue for app ${appId}`);
                this.processing.set(appId, false); // Reset processing flag to allow processing
                this.processQueue(appId);
            }
        }
    }
}

export default new QueueService();