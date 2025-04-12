import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import './models'; // Import models to register relationships
import authRoutes from './routes/auth.routes';
import appRoutes from './routes/app.routes';
import proxyRoutes from './routes/proxy.routes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Import logging middleware
import { requestLogger, errorLogger } from './middleware/logging.middleware';
import logger from './utils/logger';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/apps', appRoutes);
app.use('/apis', proxyRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Service is running' });
});

// Log errors
app.use(errorLogger);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`Unhandled error: ${err.message}`);
    logger.debug(err.stack || 'No stack trace available');

    res.status(500).json({
        message: 'Something went wrong',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        requestId: res.locals.requestId
    });
});

// Start server
const startServer = async () => {
    try {
        // Create logs directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync('logs')) {
            fs.mkdirSync('logs');
        }

        // Sync database models
        await sequelize.sync();

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        });
    } catch (error) {
        logger.error('Unable to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;