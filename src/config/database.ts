import { Sequelize } from 'sequelize';
import config from './env';
import logger from '../utils/logger';

export const sequelize = new Sequelize({
    dialect: 'postgres',
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    username: config.db.username,
    password: config.db.password,
    logging: config.db.logging ? (msg) => logger.debug(msg) : false,
    pool: config.db.pool || {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return false;
    }
};