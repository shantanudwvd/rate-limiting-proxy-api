export default {
    // Database configuration
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'rate_limiting_proxy',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        logging: false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },

    // Logging configuration for production
    logs: {
        level: 'info',
        logToFile: true,
    },

    // Queue configuration for production
    maxQueueSize: 5000,
    queueTimeout: 30000, // 30 seconds

    // Rate limiting for production
    defaultRequestLimit: 100,
};