import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { QueuedRequest } from '../types';
import { APP_CONFIG } from '../config/app';

class QueueService {
    private queues: Map<string, QueuedRequest[]> = new Map();
    private processing: Map<string, boolean> = new Map();
    private queueTimeouts: Map<string, NodeJS.Timeout> = new Map();

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

            // Create a promise that will be resolved when the request is processed
            const requestPromise = new Promise<void>((resolve, reject) => {
                // Clone the relevant request data
                const queuedRequest: QueuedRequest = {
                    id: uuidv4(),
                    appId,
                    method: req.method,
                    url: req.originalUrl,
                    headers: { ...req.headers },
                    body: req.body,
                    timestamp: Date.now(),
                    resolve,
                    reject,
                };

                // Add request to queue
                queue.push(queuedRequest);

                // Set timeout for this request
                const timeout = setTimeout(() => {
                    this.removeRequestFromQueue(appId, queuedRequest.id);
                    reject(new Error('Request timed out while waiting in queue'));
                }, APP_CONFIG.queueTimeout);

                // Store the timeout reference
                this.queueTimeouts.set(queuedRequest.id, timeout);

                // Start processing queue if not already processing
                if (!this.processing.get(appId)) {
                    this.processQueue(appId);
                }
            });

            // Handle the promise resolution/rejection
            requestPromise
                .then(() => {
                    // This will be handled by the proxy when the request is processed
                })
                .catch((error) => {
                    // If the request times out or is otherwise rejected
                    res.status(408).json({ message: error.message || 'Request timed out in queue' });
                });

            return { queued: true };
        } catch (error) {
            return { queued: false, message: 'Failed to queue request' };
        }
    }

    /**
     * Process queued requests for an app
     */
    private async processQueue(appId: string): Promise<void> {
        // Mark queue as processing
        this.processing.set(appId, true);

        // Get the queue
        const queue = this.queues.get(appId);

        if (!queue || queue.length === 0) {
            // No more requests to process
            this.processing.set(appId, false);
            return;
        }

        // Get the oldest request
        const queuedRequest = queue[0];

        // Remove request from queue
        queue.shift();

        // Clear timeout
        if (this.queueTimeouts.has(queuedRequest.id)) {
            clearTimeout(this.queueTimeouts.get(queuedRequest.id)!);
            this.queueTimeouts.delete(queuedRequest.id);
        }

        // Resolve the promise to continue processing
        queuedRequest.resolve({});

        // Wait a short time before processing next request to avoid overwhelming the target API
        setTimeout(() => {
            this.processQueue(appId);
        }, 100);
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
}

export default new QueueService();