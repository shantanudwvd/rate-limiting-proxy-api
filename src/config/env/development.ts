export default {
    // Database configuration
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'rate_limiting_proxy',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        logging: true,
    },

    // Logging configuration for development
    logs: {
        level: 'debug',
        logToFile: true,
    },

    // Queue configuration for development
    maxQueueSize: 500,
    queueTimeout: 60000, // 60 seconds

    // Rate limiting for development
    defaultRequestLimit: 200, // Higher limit for development
};