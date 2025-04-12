import { Request } from 'express';
import { RateLimitStrategy } from '../models/app.model';

// Extended Express Request with authenticated user
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        email: string;
    };
    apiKey?: string;
}

// Registration request body
export interface RegisterUserRequest {
    username: string;
    email: string;
    password: string;
}

// Login request body
export interface LoginRequest {
    username: string;
    password: string;
}

// App registration request body
export interface RegisterAppRequest {
    name: string;
    baseUrl: string;
    rateLimitStrategy: RateLimitStrategy;
    requestLimit: number;
    timeWindowMs: number;
    additionalConfig?: {
        [key: string]: any;
    };
}

// Request queue item
export interface QueuedRequest {
    id: string;
    appId: string;
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    body: any;
    timestamp: number;
    req: Request;   // Store the original request
    res: any;       // Store the original response (use 'any' to avoid type conflicts)
    resolve: (value: any) => void;  // Requires a value
    reject: (reason: any) => void;
}

// Rate limit status
export interface RateLimitStatus {
    limit: number;
    remaining: number;
    reset: number;
    isLimited: boolean;
}