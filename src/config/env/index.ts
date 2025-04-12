import dotenv from 'dotenv';
import development from './development';
import production from './production';
import test from './test';

// Load environment variables
dotenv.config();

const env = process.env.NODE_ENV || 'development';

const configs = {
    development,
    production,
    test,
};

const defaultConfig = {
    // Server configuration
    port: parseInt(process.env.PORT || '3000', 10),
    env,

    // JWT configuration
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // API configuration
    apiKeyPrefix: process.env.API_KEY_PREFIX || 'rlp_',

    // Rate limiting defaults
    defaultRateLimitStrategy: 'token_bucket',
    defaultRequestLimit: 100,
    defaultTimeWindow: 60000, // 1 minute in milliseconds

    // Queue configuration
    maxQueueSize: 1000,
    queueTimeout: 30000, // 30 seconds in milliseconds

    // Logging configuration
    logs: {
        level: process.env.LOG_LEVEL || 'info',
        logToFile: process.env.LOG_TO_FILE === 'true' || false,
        logPath: process.env.LOG_PATH || 'logs',
    },
};

// @ts-ignore
const config = { ...defaultConfig, ...configs[env] };

export default config;