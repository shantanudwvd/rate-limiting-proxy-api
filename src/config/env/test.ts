export default {
    // Database configuration
    db: {
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
        database: process.env.TEST_DB_NAME || 'rate_limiting_proxy_test',
        username: process.env.TEST_DB_USER || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'postgres',
        logging: false,
    },

    // Logging configuration for tests
    logs: {
        level: 'error', // Only log errors in tests
        logToFile: false, // Don't write to files in test environment
    },

    // Queue configuration for tests
    maxQueueSize: 100,
    queueTimeout: 5000, // 5 seconds

    // Rate limiting for tests
    defaultRequestLimit: 50,
};