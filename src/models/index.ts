import User from './user.model';
import ApiKey from './apiKey.model';
import App from './app.model';
import RateLimit from './rateLimit.model';

// Define relationships between models

// User has many ApiKeys
User.hasMany(ApiKey, {
    sourceKey: 'id',
    foreignKey: 'userId',
    as: 'apiKeys',
});
ApiKey.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});

// User has many Apps
User.hasMany(App, {
    sourceKey: 'id',
    foreignKey: 'userId',
    as: 'apps',
});
App.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});

// App has one RateLimit
App.hasOne(RateLimit, {
    sourceKey: 'id',
    foreignKey: 'appId',
    as: 'rateLimit',
});
RateLimit.belongsTo(App, {
    foreignKey: 'appId',
    as: 'app',
});

export {
    User,
    ApiKey,
    App,
    RateLimit,
};