// Mock Sequelize models
jest.mock('../models', () => {
    const SequelizeMock = require('sequelize-mock');
    const dbMock = new SequelizeMock();

    // Mock User model
    const User = dbMock.define('User', {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        password: '$2b$10$somehashedpassword',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    User.prototype.validatePassword = jest.fn().mockResolvedValue(true);

    // Mock ApiKey model
    const ApiKey = dbMock.define('ApiKey', {
        id: 'test-api-key-id',
        key: 'rlp_testkey123456',
        userId: 'test-user-id',
        isActive: true,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Add user property to ApiKey mock
    ApiKey.belongsTo = jest.fn();
    ApiKey.prototype.user = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        isActive: true
    };

    // Mock App model
    const App = dbMock.define('App', {
        id: 'test-app-id',
        name: 'Test App',
        userId: 'test-user-id',
        baseUrl: 'https://api.example.com/',
        rateLimitStrategy: 'token_bucket',
        requestLimit: 100,
        timeWindowMs: 60000,
        additionalConfig: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Mock RateLimit model
    const RateLimit = dbMock.define('RateLimit', {
        id: 'test-rate-limit-id',
        appId: 'test-app-id',
        currentCount: 0,
        windowStartTime: new Date(),
        lastRequest: new Date(),
        resetTime: new Date(Date.now() + 60000),
        tokenBucket: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    // Set up relationships
    User.hasMany(ApiKey, { foreignKey: 'userId', as: 'apiKeys' });
    ApiKey.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    User.hasMany(App, { foreignKey: 'userId', as: 'apps' });
    App.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    App.hasOne(RateLimit, { foreignKey: 'appId', as: 'rateLimit' });
    RateLimit.belongsTo(App, { foreignKey: 'appId', as: 'app' });

    // Add rateLimit property to App mock
    App.prototype.rateLimit = {
        id: 'test-rate-limit-id',
        appId: 'test-app-id',
        currentCount: 0,
        windowStartTime: new Date(),
        lastRequest: new Date(),
        resetTime: new Date(Date.now() + 60000),
        tokenBucket: 100
    };

    return {
        User,
        ApiKey,
        App,
        RateLimit,
    };
});

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.API_KEY_PREFIX = 'rlp_';