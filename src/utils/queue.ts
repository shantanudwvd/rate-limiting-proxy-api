/**
 * Basic queue implementation
 */
export class Queue<T> {
    private items: T[] = [];

    /**
     * Add an item to the end of the queue
     */
    enqueue(item: T): void {
        this.items.push(item);
    }

    /**
     * Remove and return the first item in the queue
     */
    dequeue(): T | undefined {
        return this.items.shift();
    }

    /**
     * Return the first item in the queue without removing it
     */
    peek(): T | undefined {
        return this.items[0];
    }

    /**
     * Get the number of items in the queue
     */
    get length(): number {
        return this.items.length;
    }

    /**
     * Check if the queue is empty
     */
    get isEmpty(): boolean {
        return this.items.length === 0;
    }

    /**
     * Clear all items from the queue
     */
    clear(): void {
        this.items = [];
    }
}

/**
 * Priority queue implementation
 */
export class PriorityQueue<T> {
    private items: { item: T; priority: number }[] = [];

    /**
     * Add an item to the queue with a priority
     * Lower priority number means higher priority
     */
    enqueue(item: T, priority: number): void {
        const queueElement = { item, priority };
        let added = false;

        // Add element in correct position based on priority
        for (let i = 0; i < this.items.length; i++) {
            if (priority < this.items[i].priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }

        // If no higher priority found, add to end
        if (!added) {
            this.items.push(queueElement);
        }
    }

    /**
     * Remove and return the highest priority item
     */
    dequeue(): T | undefined {
        if (this.isEmpty) return undefined;
        return this.items.shift()?.item;
    }

    /**
     * Return the highest priority item without removing it
     */
    peek(): T | undefined {
        if (this.isEmpty) return undefined;
        return this.items[0].item;
    }

    /**
     * Get the number of items in the queue
     */
    get length(): number {
        return this.items.length;
    }

    /**
     * Check if the queue is empty
     */
    get isEmpty(): boolean {
        return this.items.length === 0;
    }

    /**
     * Clear all items from the queue
     */
    clear(): void {
        this.items = [];
    }
}